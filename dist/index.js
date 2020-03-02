'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var bsonfy_1 = require("bsonfy");
var abstract_leveldown_1 = require("abstract-leveldown");
var DB = /** @class */ (function (_super) {
    __extends(DB, _super);
    function DB(db, opts) {
        var _this = _super.call(this, db.supports || {}) || this;
        _this.db = db;
        _this.opts = opts;
        _this.encodeKey = function (key) { return key; }; // no-op
        _this.decodeKey = function (key) { return Buffer.from(key).toString(); };
        _this.encodeValue = function (v) { return Buffer.from(bsonfy_1.BSON.serialize(v)); };
        _this.decodeValue = bsonfy_1.BSON.deserialize;
        _this.ltgtKeys = ['lt', 'gt', 'lte', 'gte', 'start', 'end'];
        _this.type = 'bson-down';
        opts = opts || {};
        if (opts.encodeValue)
            _this.encodeValue = opts.encodeValue;
        if (opts.decodeValue)
            _this.decodeValue = opts.decodeValue;
        return _this;
    }
    DB.prototype.encodeLtgt = function (ltgt) {
        var _this = this;
        var ret = {};
        Object.keys(ltgt).forEach(function (key) {
            ret[key] = _this.ltgtKeys.indexOf(key) > -1
                ? _this.encodeKey(ltgt[key])
                : ltgt[key];
        });
        return ret;
    };
    DB.prototype.encodeBatch = function (ops) {
        var _this = this;
        return ops.map(function (_op) {
            var op = {
                type: _op.type,
                key: _this.encodeKey(_op.key)
            };
            if (_op.prefix)
                op.prefix = _op.prefix;
            if ('value' in _op) {
                op.value = _this.encodeValue(_op.value);
            }
            return op;
        });
    };
    DB.prototype._put = function (key, value, opts, cb) {
        key = this.encodeKey(key);
        value = this.encodeValue(value);
        this.db.put(key, value, opts, cb);
    };
    DB.prototype._get = function (key, opts, cb) {
        var _this = this;
        key = this.encodeKey(key);
        this.db.get(key, opts, function (err, value) {
            if (err)
                return cb(err);
            try {
                value = _this.decodeValue(value, opts);
            }
            catch (err) {
                return cb(err);
            }
            cb(null, value);
        });
    };
    DB.prototype._del = function (key, opts, cb) {
        key = this.encodeKey(key);
        this.db.del(key, opts, cb);
    };
    DB.prototype._close = function (cb) {
        this.db.close(cb);
    };
    DB.prototype._open = function (opts, cb) {
        this.db.open(opts, cb);
    };
    DB.prototype._chainedBatch = function () {
        return new Batch(this);
    };
    DB.prototype._batch = function (ops, opts, cb) {
        ops = this.encodeBatch(ops);
        this.db.batch(ops, opts, cb);
    };
    DB.prototype._iterator = function (opts) {
        return new Iterator(this, opts);
    };
    DB.prototype._clear = function (opts, callback) {
        opts = this.encodeLtgt(opts);
        this.db.clear(opts, callback);
    };
    DB.prototype._serializeKey = function (datum) {
        return datum;
    };
    DB.prototype._serializeValue = function (datum) {
        return datum;
    };
    return DB;
}(abstract_leveldown_1.AbstractLevelDOWN));
exports.default = DB;
var Iterator = /** @class */ (function (_super) {
    __extends(Iterator, _super);
    function Iterator(db, opts) {
        var _this = _super.call(this, db) || this;
        _this.db = db;
        _this.keys = opts.keys;
        _this.values = opts.values;
        _this.opts = _this.db.encodeLtgt(opts);
        _this.it = db.db.iterator(_this.opts);
        return _this;
    }
    Iterator.prototype._next = function (cb) {
        var _this = this;
        this.it.next(function (err, key, value) {
            if (err)
                return cb(err);
            try {
                if (_this.keys && typeof key !== 'undefined') {
                    key = _this.db.decodeKey(key);
                }
                else {
                    key = undefined;
                }
                if (_this.values && typeof value !== 'undefined') {
                    value = _this.db.decodeValue(value, _this.opts);
                }
                else {
                    value = undefined;
                }
            }
            catch (err) {
                return cb(err);
            }
            cb(null, key, value);
        });
    };
    Iterator.prototype._seek = function (key) {
        key = this.db.encodeKey(key);
        this.it.seek(key);
    };
    Iterator.prototype._end = function (cb) {
        this.it.end(cb);
    };
    return Iterator;
}(abstract_leveldown_1.AbstractIterator));
var Batch = /** @class */ (function (_super) {
    __extends(Batch, _super);
    function Batch(db) {
        var _this = _super.call(this, db) || this;
        _this.db = db;
        _this.batch = db.db.batch();
        return _this;
    }
    Batch.prototype._put = function (key, value) {
        key = this.db.encodeKey(key);
        value = this.db.encodeValue(value);
        this.batch.put(key, value);
    };
    Batch.prototype._del = function (key) {
        key = this.db.encodeKey(key);
        this.batch.del(key);
    };
    Batch.prototype._clear = function () {
        this.batch.clear();
    };
    Batch.prototype._write = function (opts, cb) {
        this.batch.write(opts, cb);
    };
    return Batch;
}(abstract_leveldown_1.AbstractChainedBatch));
