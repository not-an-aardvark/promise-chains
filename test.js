/* global describe, beforeEach, it */
'use strict';
const wrap = require('.');
const expect = require('chai').use(require('dirty-chai')).expect;
const Bluebird = require('bluebird');
const SubPromise = class extends Promise {};
const asyncFn = Bluebird.coroutine;


const test_object = {
  regular_property: 'value1',
  some_other_property: new Date(),
  promise_property: Promise.resolve('value3'),
  object_property: {subproperty: 'hi! thanks for reading this source code!'},
  function_property: some_parameter => ({returned_property: some_parameter}),
  function_returning_promise_property: param => Promise.resolve(param)
};

describe('promise-chains', () => {
  let wrapped;
  beforeEach(() => {
    wrapped = wrap(Promise.resolve(test_object));
  });
  it('can use a wrapped promise with .then, like a regular promise', asyncFn(function *() {
    expect(yield wrapped).to.equal(test_object);
  }));
  it('can get a wrapped property', asyncFn(function *() {
    expect(yield wrapped.regular_property).to.equal(test_object.regular_property);
  }));
  it('resolves to undefined if given a nonexistent property', asyncFn(function *() {
    expect(yield wrapped.nonexistent_property).to.be.undefined();
  }));
  it('can call a function in a chain', asyncFn(function *() {
    expect(yield wrapped.function_property('some text')).to.eql({returned_property: 'some text'});
  }));
  it('can call a function and return a wrapped promise', asyncFn(function *() {
    expect(yield wrapped.function_property('some text').returned_property).to.equal('some text');
  }));
  it('returns a Promise of the same type when calling a wrapped Promise', () => {
    const p = wrap(Bluebird.resolve(a => a))();
    expect(p._raw).to.be.an.instanceof(Bluebird);
    expect(p._raw).to.not.be.an.instanceof(Promise);
  });
  it('wraps any promises that are returned from functions', asyncFn(function *() {
    expect(yield wrapped.function_returning_promise_property({prop: 'value'}).prop).to.equal('value');
  }));
  it('returns the same wrapped promise on multiple references to the same property', () => {
    expect(wrapped.unnecessarily_long_property_name).to.equal(wrapped.unnecessarily_long_property_name);
  });
  it('returns a wrapped promise after a .then chain', asyncFn(function *() {
    expect(yield wrapped.then(res => res).regular_property).to.equal('value1');
  }));
  it('returns a wrapped promise of the same type after a .then chain', () => {
    expect(wrap(Bluebird.resolve(5)).then(res => res)._raw).to.be.an.instanceof(Bluebird);
  });
  it('allows wrapped promises for classes to be constructed', asyncFn(function *() {
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
  it('allows a cached object to be mutated, and keeps it up-to-date', asyncFn(function *() {
    const arrayPromise = wrap(Promise.resolve({prop: [1, 2, 3]}));
    yield arrayPromise.prop.push(4);
    expect(yield arrayPromise.prop).to.eql([1, 2, 3, 4]);
  }));
  it('allows function properties to be accessed through chaining', asyncFn(function *() {
    const obj = {a: [1, 2, 3]};
    const objPromise = wrap(Promise.resolve(obj));
    objPromise.a.push.apply(yield objPromise.a, [4, 5, 6]);
    expect(yield objPromise.a).to.eql([1, 2, 3, 4, 5, 6]);
  }));
  it('returns a raw object if passed something other than a promise', () => {
    const obj = {a: [1, 2, 3]};
    expect(wrap(obj)).to.equal(obj);
  });
  it('resolves chained promises immediately if the wrapped promise is already resolved', () => {
    expect(wrap(Bluebird.resolve({a: {b: 'cookies!'}})).a.b.value()).to.equal('cookies!');
  });
  it('also works with subclassed Promises', asyncFn(function *() {
    const subclassed = SubPromise.resolve(Bluebird.delay(1).return({foo: 'bar'}));
    expect(yield wrap(subclassed).then(p => p).foo).to.equal('bar');
  }));
  it('preserves access to non-function prototype properties', asyncFn(function *() {
    const Foo = class Foo {};
    const Bar = class Bar extends Foo {};
    Foo.prototype.prototypeProperty = 5;
    const bar = new Bar();
    expect(yield wrap(Promise.resolve(bar)).prototypeProperty).to.equal(5);
  }));
});
