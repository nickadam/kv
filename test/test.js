'use strict'
const assert = require('assert')
const kv = require('../index')

describe('kv', function(){
  describe('set() no options', function(){
    const kvmem = kv(':memory:')
    it('should return null', function(){
      kvmem.set('test key', 'test value', function(err){
        kvmem.quit()
        assert.equal(err, null)
      })
    })
  })
  describe('set() with ttl', function(){
    const kvmem = kv(':memory:')
    it('should return null', function(){
      kvmem.set('test key', 'test value', {ttl: 10}, function(err){
        kvmem.quit()
        assert.equal(err, null)
      })
    })
  })
  describe('get() no options', function(){
    const kvmem = kv(':memory:')
    kvmem.set('test key', 'test value', function(err){
      it('should return "test value"', function(){
        kvmem.get('test key', function(err, data){
          kvmem.quit()
          assert.equal(data, 'test value')
        })
      })
    })
  })
  describe('get() with metadata', function(){
    const kvmem = kv(':memory:')
    kvmem.set('test key', 'test value', {ttl: 10}, function(err){
      it('should return "test value"', function(){
        kvmem.get('test key', {metadata: true}, function(err, data){
          kvmem.quit()
          assert.equal(data.v, 'test value')
        })
      })
    })
  })
  describe('set and get a lot', function(){
    it('should have length 1000', function(){
      const kvmem = kv(':memory:')
      const promises = []
      for(let i = 0; i<1000; i++){
        promises.push(new Promise(function(resolve){
          let s = ''
          for(;s.length<1000; s += String.fromCharCode(parseInt(((127 - 32) * Math.random()) + 32))){}
          kvmem.set(i.toString(), s, {}, function(err){
            resolve(err)
          })
        }))
      }
      return Promise.all(promises).then(function(results){
        kvmem.get('*', function(err, data){
          kvmem.quit()
          assert.equal(data.length, 1000)
        })
      })
    })
  })
})
