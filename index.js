'use strict';
let Reflect = require('harmony-reflect');

let handlers = {
  get: (target, property, receiver) => {
    if (property === 'inspect') {
      return () => ('[chainable Promise]');
    }
    if (property === '_raw') {
      return target();
    }
    // If the Promise itself has the property ('then', 'catch', etc.), return the property itself, bound to the target
    if (property in target()) {
      return target()[property].bind(target());
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
      if (typeof result === 'object' && result !== null) {
        return wrap(result[property]);
      }
      throw new TypeError(`Promise chain rejection: Cannot read property ${property} of ${result}.`);
    }));
    return target()._promise_chain_cache[property];
  },
  apply: (target, thisArg, args) => {
    // If the wrapped Promise is called, return a Promise that calls the result
    return wrap(Promise.all([target(), thisArg]).then(results => {
      if (typeof results[0] === 'function') {
        return wrap(results[0].apply(results[1], args));
      }
      throw new TypeError(`Promise chain rejection: Attempted to call ${results[0]} which is not a function. Params: ${args}`);
    }));
  },
  construct: (target, args) => (wrap(target().then(result => (wrap(new result(...args))))))
};

// Make sure all other references to the proxied object refer to the promise itself, not the function wrapping it
Object.keys(Reflect).forEach(handler => {
  handlers[handler] = handlers[handler] || function (target) {
    return Reflect[handler](target(), ...Array.prototype.slice.call(arguments, 1));
  };
});

function wrap (target) {
  if (typeof target === 'object' && target !== null && target.constructor.name === 'Promise') {
    // The target needs to be stored internally as a function, so that it can use the `apply` and `construct` handlers.
    target._promise_chain_cache = {};
    return new Proxy(() => (target), handlers);
  }
  return target;
};

module.exports = wrap;
