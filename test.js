'use strict';
const wrap = require('.');
const expect = require('chai').expect;

const test_object = {
  regular_property: 'value1',
  some_other_property: new Date(),
  promise_property: Promise.resolve('value3'),
  object_property: {
    subproperty: 'hi! thanks for reading this source code!'
  },
  function_property: some_parameter => ({returned_property: some_parameter}),
  function_returning_promise_property: param => (Promise.resolve(param))
}

describe('promise-chains', () => {
  let prom, wrapped;
  beforeEach(() => {
    prom = Promise.resolve(test_object);
    wrapped = wrap(prom);
  });
  it('can use a wrapped promise with .then, like a regular promise', done => {
    wrapped.then(result => {
      expect(result).to.equal(test_object);
      done();
    }).catch(done);
  });
  it('can get a wrapped property', done => {
    wrapped.regular_property.then(result => {
      expect(result).to.equal(test_object.regular_property);
      done();
    }).catch(done);
  });
  it('resolves to undefined if given a nonexistent property', done => {
    wrapped.nonexistent_property.then(result => {
      expect(result).to.be.undefined;
      done();
    }).catch(done);
  });
  it('can call a function in a chain', done => {
    wrapped.function_property('some text').then(result => {
      expect(result).to.eql({returned_property: 'some text'});
      done();
    }).catch(done);
  });
  it('can call a function and return a wrapped promise', done => {
    wrapped.function_property('some text').returned_property.then(result => {
      expect(result).to.equal('some text');
      done();
    }).catch(done);
  });
  it('wraps any promises that are returned from functions', done => {
    wrapped.function_returning_promise_property({prop: 'value'}).prop.then(result => {
      expect(result).to.equal('value');
      done();
    }).catch(done);
  });
  it('returns the same wrapped promise on multiple references to the same property', () => {
    expect(wrapped.unnecessarily_long_property_name).to.equal(wrapped.unnecessarily_long_property_name);
  });
});
