'use strict';
var handlers;

var wrap = function (target) {
  if (typeof target === 'object' && target && typeof target.then === 'function' && typeof Proxy !== 'undefined') {
    // The target needs to be stored internally as a function, so that it can use the `apply` and `construct` handlers.
    // (At the moment, v8 actually allows non-functions to use the `apply` trap, but this goes against the ES2015 spec, and
    // the behavior throws errors on browsers other than Chrome.)
    var targetFunc = function () {
      return target;
    };
    targetFunc._promise_chain_cache = Object.create(null);
    return new Proxy(targetFunc, handlers);
  }
  return target;
};

if (typeof Proxy !== 'undefined') {
  if (typeof Reflect === 'undefined') {
    require('harmony-reflect');
  }
  handlers = {
    get: function (target, property) {
      if (property === 'inspect') {
        return function () {
          return '[chainable Promise]';
        };
      }
      if (property === '_raw') {
        return target();
      }
      // If the Promise itself has the property ('then', 'catch', etc.), return the property itself, bound to the target.
      // However, wrap the result of calling this function. This allows wrappedPromise.then(something) to also be wrapped.
      if (property in target()) {
        if (property !== 'constructor' && !property.startsWith('_') && typeof target()[property] === 'function') {
          return function () {
            // Create a new Array rather than simply passing `arguments`, to avoid disabling V8 optimization
            var args = Array(arguments.length);
            for (var i = 0; i < arguments.length; i++) {
              args[i] = arguments[i];
            }
            return wrap(target()[property].apply(target(), args));
          };
        }
        return target()[property];
      }
      // If the property has a value in the cache, use that value.
      if (Object.prototype.hasOwnProperty.call(target._promise_chain_cache, property)) {
        return target._promise_chain_cache[property];
      }
      // If the Promise library allows synchronous inspection (bluebird, etc.), ensure that properties of resolved
      // Promises are also resolved immediately.
      if (target().isFulfilled && target().isFulfilled() && typeof target().value === 'function') {
        return wrap(target().constructor.resolve(target().value()[property]));
      }
      // Otherwise, return a promise for that property.
      // Store it in the cache so that subsequent references to that property will return the same promise.
      target._promise_chain_cache[property] = wrap(target().then(function (result) {
        if (result && (typeof result === 'object' || typeof result === 'function')) {
          return wrap(result[property]);
        }
        throw new TypeError("Promise chain rejection: Cannot read property '" + property + "' of " + result + '.');
      }));
      return target._promise_chain_cache[property];
    },
    apply: function (target, thisArg, args) {
      // If the wrapped Promise is called, return a Promise that calls the result
      return wrap(target().constructor.all([target(), thisArg]).then(function (results) {
        if (typeof results[0] === 'function') {
          return wrap(Reflect.apply(results[0], results[1], args));
        }
        throw new TypeError('Promise chain rejection: Attempted to call ' + results[0] + ' which is not a function.');
      }));
    },
    construct: function (target, args) {
      return wrap(target().then(function (result) {
        return wrap(Reflect.construct(result, args));
      }));
    }
  };

  // Make sure all other references to the proxied object refer to the promise itself, not the function wrapping it
  Reflect.ownKeys(Reflect).forEach(function (handler) {
    handlers[handler] = handlers[handler] || function (target, arg1, arg2, arg3) {
      return Reflect[handler](target(), arg1, arg2, arg3);
    };
  });
}

module.exports = wrap;
