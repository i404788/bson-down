'use strict'
import { BSON } from "bsonfy";

const { AbstractLevelDOWN, AbstractChainedBatch, AbstractIterator } = require('abstract-leveldown')

export default class DB extends AbstractLevelDOWN {
  public encodeKey = BSON.serialize
  public decodeKey = BSON.deserialize

  public encodeValue = BSON.serialize
  public decodeValue = BSON.deserialize
  private ltgtKeys = ['lt', 'gt', 'lte', 'gte', 'start', 'end']

  constructor(public db, public opts) {
    super(db.supports || {})

    opts = opts || {}
    if (typeof opts.keyEncoding === 'undefined') opts.keyEncoding = 'utf8'
    if (typeof opts.valueEncoding === 'undefined') opts.valueEncoding = 'utf8'

    this.db = db
  }

  public encodeLtgt(ltgt: any) {
    var ret = {}
    Object.keys(ltgt).forEach((key) => {
      ret[key] = this.ltgtKeys.indexOf(key) > -1
        ? this.encodeKey(ltgt[key])
        : ltgt[key]
    })
    return ret
  }

  private encodeBatch(ops: any) {

    return ops.map((_op) => {
      let op: { type: string, key: any, value?: any, prefix?: any } = {
        type: _op.type,
        key: this.encodeKey(_op.key)
      }
      if (_op.prefix) op.prefix = _op.prefix
      if ('value' in _op) {
        op.value = this.encodeValue(_op.value)
      }
      return op
    })
  }

  _put(key, value, opts, cb) {
    key = this.encodeKey(key)
    value = this.encodeValue(value)
    this.db.put(key, value, opts, cb)
  }

  _get(key, opts, cb) {
    key = this.encodeKey(key)
    this.db.get(key, opts, (err, value) => {
      if (err) return cb(err)
      try {
        value = this.decodeValue(value, opts)
      } catch (err) {
        return cb(err)
      }
      cb(null, value)
    })
  }

  _del(key, opts, cb) {
    key = this.encodeKey(key)
    this.db.del(key, opts, cb)
  }

  _close(cb) {
    this.db.close(cb)
  }

  _open(opts, cb) {
    this.db.open(opts, cb)
  }

  _chainedBatch() {
    return new Batch(this)
  }

  _batch(ops, opts, cb) {
    ops = this.encodeBatch(ops)
    this.db.batch(ops, opts, cb)
  }

  _iterator(opts) {
    return new Iterator(this, opts)
  }

  _clear(opts, callback) {
    opts = this.encodeLtgt(opts)
    this.db.clear(opts, callback)
  }

  _serializeKey(datum) {
    return datum
  }

  _serializeValue(datum) {
    return datum
  }
  type = 'bson-down'
}

class Iterator extends AbstractIterator {
  public keys: boolean
  public values: boolean
  public opts: any
  public it: any
  constructor(public db: DB, opts: any) {
    super(db)
    this.keys = opts.keys
    this.values = opts.values
    this.opts = this.db.encodeLtgt(opts)
    this.it = db.db.iterator(this.opts)
  }


  _next(cb) {
    this.it.next((err, key, value) => {
      if (err) return cb(err)
      try {
        if (this.keys && typeof key !== 'undefined') {
          key = this.db.decodeKey(key, this.opts)
        } else {
          key = undefined
        }

        if (this.values && typeof value !== 'undefined') {
          value = this.db.decodeValue(value, this.opts)
        } else {
          value = undefined
        }
      } catch (err) {
        return cb(err)
      }
      cb(null, key, value)
    })
  }

  _seek(key) {
    key = this.db.encodeKey(key)
    this.it.seek(key)
  }

  _end(cb) {
    this.it.end(cb)
  }

}

class Batch extends AbstractChainedBatch {
  private batch: any
  constructor(public db) {
    super(db)
    this.batch = db.db.batch()
  }

  _put(key, value) {
    key = this.db.encodeKey(key)
    value = this.db.encodeValue(value)
    this.batch.put(key, value)
  }

  _del(key) {
    key = this.db.encodeKey(key)
    this.batch.del(key)
  }

  _clear() {
    this.batch.clear()
  }

  _write(opts, cb) {
    this.batch.write(opts, cb)
  }
}