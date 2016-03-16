/* global describe, beforeEach, it */
'use strict';
const wrap = require('.');
const expect = require('chai').use(require('dirty-chai')).expect;
const Bluebird = require('bluebird');

const test_object = {
  regular_property: 'value1',
  some_other_property: new Date(),
  promise_property: Promise.resolve('value3'),
  object_property: {
    subproperty: 'hi! thanks for reading this source code!'
  },
  function_property: some_parameter => ({returned_property: some_parameter}),
  function_returning_promise_property: param => Promise.resolve(param)
};

describe('promise-chains', () => {
  let wrapped;
  beforeEach(() => {
    wrapped = wrap(Promise.resolve(test_object));
  });
  it('can use a wrapped promise with .then, like a regular promise', Bluebird.coroutine(function *() {
    expect(yield wrapped).to.equal(test_object);
  }));
  it('can get a wrapped property', Bluebird.coroutine(function *() {
    expect(yield wrapped.regular_property).to.equal(test_object.regular_property);
  }));
  it('resolves to undefined if given a nonexistent property', Bluebird.coroutine(function *() {
    expect(yield wrapped.nonexistent_property).to.be.undefined();
  }));
  it('can call a function in a chain', Bluebird.coroutine(function *() {
    expect(yield wrapped.function_property('some text')).to.eql({returned_property: 'some text'});
  }));
  it('can call a function and return a wrapped promise', Bluebird.coroutine(function *() {
    expect(yield wrapped.function_property('some text').returned_property).to.equal('some text');
  }));
  it('wraps any promises that are returned from functions', Bluebird.coroutine(function *() {
    expect(yield wrapped.function_returning_promise_property({prop: 'value'}).prop).to.equal('value');
  }));
  it('returns the same wrapped promise on multiple references to the same property', () => {
    expect(wrapped.unnecessarily_long_property_name).to.equal(wrapped.unnecessarily_long_property_name);
  });
  it('returns a wrapped promise after a .then chain', Bluebird.coroutine(function *() {
    expect(yield wrapped.then(res => res).regular_property).to.equal('value1');
  }));
  it('allows wrapped promises for classes to be constructed', Bluebird.coroutine(function *() {
    const Foo = class {
      constructor (a, b, c) {
        this.a = a;
        this.b = b;
        this.c = c;
      }
    };
    const FooPromise = wrap(Promise.resolve(Foo));
    const result = yield new FooPromise(1, 2, 3);
    expect(result.a).to.equal(1);
    expect(result.b).to.equal(2);
    expect(result.c).to.equal(3);
    expect(result).to.be.an.instanceof(Foo);
  }));
});
