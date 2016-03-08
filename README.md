# promise-chains [![Build Status](https://travis-ci.org/not-an-aardvark/promise-chains.svg?branch=master)](https://travis-ci.org/not-an-aardvark/promise-chains)

`promise-chains` is a simple wrapper function for JavaScript Promises which allows them to be easily manipulated using synchronous syntax.

With normal syntax, one might write:

```javascript
var foo = promise_for_some_timeconsuming_operation;
var baz = foo.then(function(result) {
  return result.bar;
});
// i.e. `baz` is a promise that will resolve with the 'bar' property of the output of foo.
```

With `promise-chains`, `baz` can be expressed as a direct property of `foo`, making the syntax simpler:

```javascript
var wrap = require('promise-chains');
var baz = wrap(promise_for_some_timeconsuming_operation).bar;
// `baz` is equivalent to what it was above
```

This works with function calls, and can be chained:

```javascript
var cookies_promise = Promise.delay(5000).return('cookies'); // (resolves with 'cookies' after 5 seconds)
wrap(cookies_promise).split('').join('_').toUpperCase().then(console.log);
// --> prints 'C_O_O_K_I_E_S' after 5 seconds
```

If a wrapped function call returns a promise, the result will also be wrapped.

```javascript
var example_promise = some_async_operation();
var result = wrap(example_promise).parse_somehow().do_some_other_async_operation().parse_this_response_too().foo;
// `result` is a Promise that resolves with the `foo` property the of result of both operations, parsing etc.
```

### To use/install:

```bash
$ npm install promise-chains
```

Note: `promise-chains` uses the ES2015 `Proxy` object, which is currently not included in the Node runtime by default. To use it, you will have to use Node's --harmony-proxies flag. (e.g. instead of using `node yourProject.js`, use `node --harmony-proxies yourProject.js`).

Other things to note:

* If `wrap` is called on anything other than a Promise, it will just silently return that thing.
* If a chained Promise tries to access a nonexistent property, the Promise will end up rejecting with a TypeError. (This is analogous to the `Cannot read property 'foo' of undefined` error that one would encounter when using objects normally.)
* To "unwrap" a wrapped promise, access its `_raw` property. i.e. `wrap(some_promise)._raw === some_promise`
