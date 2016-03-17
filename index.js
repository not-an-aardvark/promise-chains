'use strict';
let handlers;

const wrap = target => {
  if (typeof target === 'object' && target && target.constructor.name === 'Promise' && typeof Proxy !== 'undefined') {
    // The target needs to be stored internally as a function, so that it can use the `apply` and `construct` handlers.
    // (At the moment, v8 actually allows non-functions to use the `apply` trap, but this goes against the ES2015 spec, and
    // the behavior throws errors on browsers other than Chrome.)
    target._promise_chain_cache = {};
    return new Proxy(() => target, handlers);
  }
  return target;
};

if (typeof Proxy !== 'undefined') {
  require('harmony-reflect');
  handlers = {
    get (target, property) {
      if (property === 'inspect') {
        return () => '[chainable Promise]';
      }
      if (property === '_raw') {
        return target();
      }
      // If the Promise itself has the property ('then', 'catch', etc.), return the property itself, bound to the target.
      // However, wrap the result of calling this function. This allows wrappedPromise.then(something) to also be wrapped.
      if (property in target()) {
        if (typeof target()[property] === 'function') {
          return new Proxy(target()[property].bind(target()), {apply (applyTarget, args, thisArg) {
            return wrap(Reflect.apply(applyTarget, args, thisArg));
          }});
        }
        return target()[property];
      }
      // If the property has a value in the cache, use that value.
      if (target()._promise_chain_cache.hasOwnProperty(property)) {
        return target()._promise_chain_cache[property];
      }
      // If the Promise library allows synchronous inspection (bluebird, etc.), ensure that properties of resolved
      // Promises are also resolved immediately.
      if (target().isFulfilled && target().isFulfilled() && typeof target().value === 'function') {
        return wrap(target().constructor.resolve(target().value()[property]));
      }
      // Otherwise, return a promise for that property.
      // Store it in the cache so that subsequent references to that property will return the same promise.
      target()._promise_chain_cache[property] = wrap(target().then(result => {
        if (result && (typeof result === 'object' || typeof result === 'function')) {
          return wrap(result[property]);
        }
        throw new TypeError(`Promise chain rejection: Cannot read property '${property}' of ${result}.`);
      }));
      return target()._promise_chain_cache[property];
    },
    apply (target, thisArg, args) {
      // If the wrapped Promise is called, return a Promise that calls the result
      return wrap(target().constructor.all([target(), thisArg]).then(results => {
        if (typeof results[0] === 'function') {
          return wrap(Reflect.apply(results[0], results[1], args));
        }
        throw new TypeError(`Promise chain rejection: Attempted to call ${results[0]} which is not a function.`);
      }));
    },
    construct: (target, args) => wrap(target().then(result => {
      // Ideally this would just be `new result(...args)` or `Reflect.construct(result, args)`, but node 4 doesn't support
      // the spread operator and harmony-reflect seems to have a bug with Reflect.construct().
      return wrap(new (Function.prototype.bind.apply(result, [null].concat(args))));
    }))
  };

  // Make sure all other references to the proxied object refer to the promise itself, not the function wrapping it
  Reflect.ownKeys(Reflect).forEach(handler => {
    handlers[handler] = handlers[handler] || ((target, arg1, arg2, arg3) => Reflect[handler](target(), arg1, arg2, arg3));
  });
}

module.exports = wrap;
