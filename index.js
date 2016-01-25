'use strict';
let Reflect = require('harmony-reflect');

let handlers = {
  get: (target, property, receiver) => {
    if (property === 'inspect') {
      return () => ('[wrapped Promise]');
    }
    if (property === '_raw') {
      return target();
    }
    // If the Promise itself has the property ('then', 'catch', etc.), return the property itself, bound to the target
    if (property in target()) {
      return target()[property].bind(target());
    }
    // Otherwise, return a promise for that property
    return wrap(target().then(result => (wrap(result[property]))));
  },
  apply: (target, thisArg, args) => {
    // If the wrapped Promise is called, return a Promise that calls the result
    return wrap(Promise.all([target(), thisArg]).then(results => {
      return wrap(results[0].apply(results[1], args));
    }));
  },
  construct: (target, args) => (wrap(target().then(result => (wrap(new result(...args))))))
};

// Make sure all other references to the proxied object refer to the promise itself, not the function wrapping it
['getPrototypeOf', 'setPrototypeOf', 'isExtensible', 'preventExtensions', 'getOwnPropertyDescriptor',
'defineProperty', 'has', 'set', 'deleteProperty', 'enumerate', 'ownKeys'].forEach(handler => {
  handlers[handler] = function (target) {
    return Reflect[handler](target(), ...Array.prototype.slice.call(arguments, 1));
  };
});

function wrap (target) {
  // The target needs to be stored internally as a function, so that it can use the `apply` and `construct` handlers.
  return (target instanceof Promise) ? new Proxy(() => (target), handlers) : target;
};

module.exports = wrap;
