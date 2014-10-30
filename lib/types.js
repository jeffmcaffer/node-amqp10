var debug       = require('debug')('amqp10-types'),
    butils      = require('butils'),
    builder     = require('buffer-builder'),
    CBuffer     = require('cbarrick-circular-buffer'),
    Int64       = require('node-int64'),

    exceptions  = require('./exceptions');

/**
 * Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint will
 * encode to the fixed-zero-value, the short uint, or the full uint as appropriate).
 *
 * @function encoder
 * @param val               Value to encode (for fixed value encoders (e.g. null) this will be ignored)
 * @param {builder} buf     Buffer-builder into which to write code and encoded value
 * @param {Codec} [codec]   If needed, the codec to encode other values (e.g. for lists/arrays)
 */

/**
 * Decoder methods decode an incoming buffer into an appropriate concrete JS entity.
 *
 * @function decoder
 * @param {Buffer} buf          Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)
 * @param {Codec} [codec]       If needed, the codec to decode sub-values for composite types.
 * @return                      Decoded value
 */

/**
 *  Type definitions, encoders, and decoders - used extensively by {@link Codec}.
 *
 * @constructor
 */
var Types = function() {
    this.typesArray = [];
    this.builders = {};
    this.decoders = {};
    this._initTypesArray();
    this._initEncodersDecoders();
};

/**
 * Encoder for list types, specified in AMQP 1.0 as:
 *
 <pre>
                       +----------= count items =----------+
                       |                                   |
   n OCTETs   n OCTETs |                                   |
 +----------+----------+--------------+------------+-------+
 |   size   |  count   |      ...    /|    item    |\ ...  |
 +----------+----------+------------/ +------------+ \-----+
                                   / /              \ \
                                  / /                \ \
                                 / /                  \ \
                                +-------------+----------+
                                | constructor |   data   |
                                +-------------+----------+

              Subcategory     n
              =================
              0xC             1
              0xD             4
 </pre>
 *
 * @private
 */
Types.prototype._listBuilder = function(val, bufb, codec) {
    if (typeof val === 'object') {
        if (val instanceof Array) {
            if (val.length === 0) {
                bufb.appendUInt8(0x45);
            } else {
                // Encode all elements into a temp buffer to allow us to front-load appropriate size and count.
                var tempBuilder = new builder();
                for (var idx in val) {
                    var curVal = val[idx];
                    codec.encode(curVal, tempBuilder);
                }
                var tempBuffer = tempBuilder.get();

                // Code, size, length, data
                if (tempBuffer.length < 0xFF && val.length < 0xFF) {
                    // Short lists
                    bufb.appendUInt8(0xC0);
                    bufb.appendUInt8(tempBuffer.length+1);
                    bufb.appendUInt8(val.length);
                } else {
                    // Long lists
                    bufb.appendUInt8(0xD0);
                    bufb.appendUInt32BE(tempBuffer.length+4);
                    bufb.appendUInt32BE(val.length);
                }
                bufb.appendBuffer(tempBuffer);
            }
        } else {
            throw new exceptions.NotImplementedError('Unsure how to encode non-array as list');
        }
    } else {
        throw new exceptions.NotImplementedError('Unsure how to encode non-object as list');
    }
};

Types.prototype._listDecoder = function(countSize, buf, codec) {
    var size = 0;
    var count = 0;
    if (countSize === 1) {
        size = butils.readInt(buf, 0);
        count = butils.readInt(buf, 1);
    } else {
        size = butils.readInt32(buf, 0);
        count = butils.readInt32(buf, countSize);
    }
    var offset = countSize * 2;
    var decoded = codec.decode(buf, offset);
    var result = [];
    while(decoded !== undefined) {
        result.push(decoded[0]);
        offset += decoded[1];
        decoded = codec.decode(buf, offset);
    }
    return result;
};

/**
 *
 * All array encodings consist of a size followed by a count followed by an element constructor
 * followed by <i>count</i> elements of encoded data formatted as required by the element
 * constructor:
 <pre>
                                             +--= count elements =--+
                                             |                      |
   n OCTETs   n OCTETs                       |                      |
 +----------+----------+---------------------+-------+------+-------+
 |   size   |  count   | element-constructor |  ...  | data |  ...  |
 +----------+----------+---------------------+-------+------+-------+

                         Subcategory     n
                         =================
                         0xE             1
                         0xF             4
 </pre>
 *
 * @private
 */
Types.prototype._arrayBuilder = function(val, bufb, codec) {
    if (typeof val === 'object') {
        if (val instanceof Array) {
            if (val.length === 0) {
                bufb.appendUInt8(0x40); // null
            } else {
                throw new exceptions.NotImplementedError('Must enhance encoders to allow flag to suppress type code');
            }
        } else {
            throw new exceptions.NotImplementedError('Unsure how to encode non-array as array');
        }
    } else {
        throw new exceptions.NotImplementedError('Unsure how to encode non-object as array');
    }
};

Types.prototype._arrayDecoder = function(countSize, buf, codec) {
    var size = 0;
    var count = 0;
    if (countSize === 1) {
        size = butils.readInt(buf, 0);
        count = butils.readInt(buf, 1);
    } else {
        size = butils.readInt32(buf, 0);
        count = butils.readInt32(buf, countSize);
    }
    var offset = countSize * 2;
    throw new exceptions.NotImplementedError('Must enhance decoders to allow flag to suppress reading type code, and force types');
};

/**
 * A map is encoded as a compound value where the constituent elements form alternating key value pairs.
 *
 <pre>
  item 0   item 1      item n-1    item n
 +-------+-------+----+---------+---------+
 | key 1 | val 1 | .. | key n/2 | val n/2 |
 +-------+-------+----+---------+---------+
 </pre>
 *
 * Map encodings must contain an even number of items (i.e. an equal number of keys and
 * values). A map in which there exist two identical key values is invalid. Unless known to
 * be otherwise, maps must be considered to be ordered - that is the order of the key-value
 * pairs is semantically important and two maps which are different only in the order in
 * which their key-value pairs are encoded are not equal.
 *
 * @private
 */
Types.prototype._mapBuilder = function(val, bufb, codec) {
    if (typeof val === 'object') {
        if (val instanceof Array) {
            throw new exceptions.NotImplementedError('Unsure how to encode array as map');
        } else {
            var keys = Object.keys(val);
            if (keys.length === 0) {
                bufb.appendUInt8(0x40); // null
            } else {
                // Encode all elements into a temp buffer to allow us to front-load appropriate size and count.
                var tempBuilder = new builder();
                for (var idx in keys) {
                    var curKey = keys[idx];
                    var curVal = val[curKey];
                    codec.encode(curKey, tempBuilder);
                    codec.encode(curVal, tempBuilder);
                }
                var tempBuffer = tempBuilder.get();

                // Code, size, length, data
                if (tempBuffer.length < 0xFF && val.length < 0xFF) {
                    // Short lists
                    bufb.appendUInt8(0xC1);
                    bufb.appendUInt8(tempBuffer.length+1);
                    bufb.appendUInt8(keys.length * 2);
                } else {
                    // Long lists
                    bufb.appendUInt8(0xD1);
                    bufb.appendUInt32BE(tempBuffer.length+4);
                    bufb.appendUInt32BE(keys.length * 2);
                }
                bufb.appendBuffer(tempBuffer);
            }
        }
    } else {
        throw new exceptions.NotImplementedError('Unsure how to encode non-object as array');
    }
};

Types.prototype._mapDecoder = function(countSize, buf, codec) {
    var size = 0;
    var count = 0;
    if (countSize === 1) {
        size = butils.readInt(buf, 0);
        count = butils.readInt(buf, 1);
    } else {
        size = butils.readInt32(buf, 0);
        count = butils.readInt32(buf, countSize);
    }
    var offset = countSize * 2;
    var decodedKey = codec.decode(buf, offset);
    var decodedVal;
    var result = {};
    while(decodedKey !== undefined) {
        offset += decodedKey[1];
        decodedVal = codec.decode(buf, offset);
        if (decodedVal !== undefined) {
            result[decodedKey[0]] = decodedVal[0];
            offset += decodedVal[1];
            decodedKey = codec.decode(buf, offset);
        }
    }
    return result;
};

/**
 * Initialize list of all types.  Each contains a number of encodings, one of which contains an encoder method and all contain decoders.
 *
 * @private
 */
Types.prototype._initTypesArray = function() {
    var self = this;
    this.typesArray = [
        {
            "class": "primitive",
            "name": "null",
            "label": "indicates an empty value",
            "builder": function(val, bufb) { bufb.appendUInt8(0x40); },
            "encodings": [
                {
                    "code": "0x40",
                    "category": "fixed",
                    "width": "0",
                    "label": "the null value",
                    "decoder": function(buf) { return null; }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "boolean",
            "label": "represents a true or false value",
            "builder": function(val, bufb) { bufb.appendUInt8(val ? 0x41 : 0x42); },
            "encodings": [
                {
                    "code": "0x56",
                    "category": "fixed",
                    "width": "1",
                    "label": "boolean with the octet 0x00 being false and octet 0x01 being true",
                    "decoder": function(buf) { return buf[0]; }
                },
                {
                    "code": "0x41",
                    "category": "fixed",
                    "width": "0",
                    "label": "the boolean value true",
                    "decoder": function(buf) { return true; }
                },
                {
                    "code": "0x42",
                    "category": "fixed",
                    "width": "0",
                    "label": "the boolean value false",
                    "decoder": function(buf) { return false; }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "ubyte",
            "label": "integer in the range 0 to 2^8 - 1 inclusive",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x50);
                bufb.appendUInt8(val);
            },
            "encodings": [
                {
                    "code": "0x50",
                    "category": "fixed",
                    "width": "1",
                    "label": "8-bit unsigned integer",
                    "decoder": function(buf) { return buf[0]; }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "ushort",
            "label": "integer in the range 0 to 2^16 - 1 inclusive",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x60);
                bufb.appendUInt16BE(val);
            },
            "encodings": [
                {
                    "code": "0x60",
                    "category": "fixed",
                    "width": "2",
                    "label": "16-bit unsigned integer in network byte order",
                    "decoder": function(buf) { return buf.readUInt16BE(0); }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "uint",
            "label": "integer in the range 0 to 2^32 - 1 inclusive",
            "builder": function(val, bufb) {
                if (val === 0) {
                    bufb.appendUInt8(0x43);
                } else if (val < 0xFF) {
                    bufb.appendUInt8(0x52);
                    bufb.appendUInt8(val);
                } else {
                    bufb.appendUInt8(0x70);
                    bufb.appendUInt32BE(val);
                }
            },
            "encodings": [
                {
                    "code": "0x70",
                    "category": "fixed",
                    "width": "4",
                    "label": "32-bit unsigned integer in network byte order",
                    "decoder": function(buf) {
                        return butils.readInt32(buf, 0);
                    }
                },
                {
                    "code": "0x52",
                    "category": "fixed",
                    "width": "1",
                    "label": "unsigned integer value in the range 0 to 255 inclusive",
                    "decoder": function(buf) {
                        return buf[0];
                    }
                },
                {
                    "code": "0x43",
                    "category": "fixed",
                    "width": "0",
                    "label": "the uint value 0",
                    "decoder": function(buf) { return 0; }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "ulong",
            "label": "integer in the range 0 to 2^64 - 1 inclusive",
            "builder": function (val, bufb) {
                bufb.appendUInt8(0x80);
                if (val instanceof Int64) {
                    bufb.appendBuffer(val.toBuffer(true));
                } else if (typeof val === 'number') {
                    if (val < 0xFFFFFFFF) {
                        bufb.appendUInt32BE(0x0);
                        bufb.appendUInt32BE(val);
                    } else {
                        throw new exceptions.NotImplementedError('No int64 Number supported by buffer builder');
                    }
                } else {
                    throw new Error('Invalid encoding type for 64-bit value: ' + val);
                }
            },
            "encodings": [
                {
                    "code": "0x80",
                    "category": "fixed",
                    "width": "8",
                    "label": "64-bit unsigned integer in network byte order",
                    "decoder": function(buf) {
                        return new Int64(buf);
                    }
                },
                {
                    "code": "0x53",
                    "category": "fixed",
                    "width": "1",
                    "label": "unsigned long value in the range 0 to 255 inclusive",
                    "decoder": function(buf) {
                        return butils.readInt(buf, 0);
                    }
                },
                {
                    "code": "0x44",
                    "category": "fixed",
                    "width": "0",
                    "label": "the ulong value 0",
                    "decoder": function(buf) { return 0; }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "byte",
            "label": "integer in the range -(2^7) to 2^7 - 1 inclusive",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x51);
                bufb.appendInt8(val);
            },
            "encodings": [
                {
                    "code": "0x51",
                    "category": "fixed",
                    "width": "1",
                    "label": "8-bit two's-complement integer",
                    "decoder": function(buf) {
                        return buf.readInt8(0);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "short",
            "label": "integer in the range -(2^15) to 2^15 - 1 inclusive",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x61);
                bufb.appendInt16BE(val);
            },
            "encodings": [
                {
                    "code": "0x61",
                    "category": "fixed",
                    "width": "2",
                    "label": "16-bit two's-complement integer in network byte order",
                    "decoder": function(buf) {
                        return buf.readInt16BE(0);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "int",
            "label": "integer in the range -(2^31) to 2^31 - 1 inclusive",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x71);
                bufb.appendInt32BE(val);
            },
            "encodings": [
                {
                    "code": "0x71",
                    "category": "fixed",
                    "width": "4",
                    "label": "32-bit two's-complement integer in network byte order",
                    "decoder": function(buf) {
                        return buf.readInt32BE(0);
                    }
                },
                {
                    "code": "0x54",
                    "category": "fixed",
                    "width": "1",
                    "label": "signed integer value in the range -128 to 127 inclusive",
                    "decoder": function(buf) {
                        return buf.readInt8(0);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "long",
            "label": "integer in the range -(2^63) to 2^63 - 1 inclusive",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x81);
                if (val instanceof Int64) {
                    bufb.appendBuffer(val.toBuffer(true));
                } else if (typeof val === 'number') {
                    if (Math.abs(val) < 0xFFFFFFFF) {
                        bufb.appendUInt32BE(val < 0 ? 0x80000000 : 0x0);
                        bufb.appendUInt32BE(Math.abs(val));
                    } else {
                        throw new exceptions.NotImplementedError('buffer-builder does not support 64-bit int appending');
                    }
                } else {
                    throw new Error('Invalid encoding type for 64-bit value: ' + val);
                }
            },
            "encodings": [
                {
                    "code": "0x81",
                    "category": "fixed",
                    "width": "8",
                    "label": "64-bit two's-complement integer in network byte order",
                    "decoder": function(buf) {
                        return new Int64(buf);
                    }
                },
                {
                    "code": "0x55",
                    "category": "fixed",
                    "width": "1",
                    "label": "signed long value in the range -128 to 127 inclusive",
                    "decoder": function(buf) {
                        return buf.readInt8(0);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "float",
            "label": "32-bit floating point number (IEEE 754-2008 binary32)",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x72);
                bufb.appendFloatBE(val);
            },
            "encodings": [
                {
                    "code": "0x72",
                    "category": "fixed",
                    "width": "4",
                    "label": "IEEE 754-2008 binary32",
                    "decoder": function(buf) {
                        return buf.readFloatBE(0);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "double",
            "label": "64-bit floating point number (IEEE 754-2008 binary64)",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x82);
                bufb.appendDoubleBE(val);
            },
            "encodings": [
                {
                    "code": "0x82",
                    "category": "fixed",
                    "width": "8",
                    "label": "IEEE 754-2008 binary64",
                    "decoder": function(buf) {
                        return buf.readDoubleBE(0);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "decimal32",
            "label": "32-bit decimal number (IEEE 754-2008 decimal32)",
            "builder": function(val, bufb) {
                throw new exceptions.NotImplementedError('Decimal32');
            },
            "encodings": [
                {
                    "code": "0x74",
                    "category": "fixed",
                    "width": "4",
                    "label": "IEEE 754-2008 decimal32 using the Binary Integer Decimal encoding",
                    "decoder": function(buf) {
                        throw new exceptions.NotImplementedError('Decimal32');
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "decimal64",
            "label": "64-bit decimal number (IEEE 754-2008 decimal64)",
            "builder": function(val, bufb) {
                throw new exceptions.NotImplementedError('Decimal64');
            },
            "encodings": [
                {
                    "code": "0x84",
                    "category": "fixed",
                    "width": "8",
                    "label": "IEEE 754-2008 decimal64 using the Binary Integer Decimal encoding",
                    "decoder": function(buf) {
                        throw new exceptions.NotImplementedError('Decimal64');
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "decimal128",
            "label": "128-bit decimal number (IEEE 754-2008 decimal128)",
            "builder": function(val, bufb) {
                throw new exceptions.NotImplementedError('Decimal128');
            },
            "encodings": [
                {
                    "code": "0x94",
                    "category": "fixed",
                    "width": "16",
                    "label": "IEEE 754-2008 decimal128 using the Binary Integer Decimal encoding",
                    "decoder": function(buf) {
                        throw new exceptions.NotImplementedError('Decimal128');
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "char",
            "label": "a single unicode character",
            "builder": function(val, bufb) {
                throw new exceptions.NotImplementedError('UTF32');
            },
            "encodings": [
                {
                    "code": "0x73",
                    "category": "fixed",
                    "width": "4",
                    "label": "a UTF-32BE encoded unicode character",
                    "decoder": function(buf) {
                        throw new exceptions.NotImplementedError('UTF32');
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "timestamp",
            "label": "an absolute point in time",
            "builder": function(val, bufb) {
                bufb.appendUInt8(0x83);
                if (val instanceof Int64) {
                    bufb.appendBuffer(val.toBuffer(true));
                } else if (typeof val === 'number') {
                    if (Math.abs(val) < 0xFFFFFFFF) {
                        bufb.appendUInt32BE(val < 0 ? 0x80000000 : 0x0);
                        bufb.appendUInt32BE(Math.abs(val));
                    } else {
                        throw new exceptions.NotImplementedError('buffer-builder does not support 64-bit int appending');
                    }
                } else {
                    throw new Error('Invalid encoding type for 64-bit value: ' + val);
                }
            },
            "encodings": [
                {
                    "code": "0x83",
                    "category": "fixed",
                    "width": "8",
                    "label": "64-bit signed integer representing milliseconds since the unix epoch",
                    "decoder": function(buf) {
                        return new Int64(buf);
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "uuid",
            "label": "a universally unique id as defined by RFC-4122 section 4.1.2",
            "builder": function(val, bufb) {
                throw new exceptions.NotImplementedError('UUID');
            },
            "encodings": [
                {
                    "code": "0x98",
                    "category": "fixed",
                    "width": "16",
                    "label": "UUID as defined in section 4.1.2 of RFC-4122",
                    "decoder": function(buf) {
                        throw new exceptions.NotImplementedError('UUID');
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "binary",
            "label": "a sequence of octets",
            "builder": function(val, bufb) {
                if (val.length <= 0xFF) {
                    bufb.appendUInt8(0xA0);
                    bufb.appendUInt8(val.length);
                } else {
                    bufb.appendUInt8(0xA0);
                    bufb.appendUInt32BE(val.length);
                }
                bufb.appendBuffer(val);
            },
            "encodings": [
                {
                    "code": "0xa0",
                    "category": "variable",
                    "width": "1",
                    "label": "up to 2^8 - 1 octets of binary data",
                    "decoder": function(buf) { return buf; }
                },
                {
                    "code": "0xb0",
                    "category": "variable",
                    "width": "4",
                    "label": "up to 2^32 - 1 octets of binary data",
                    "decoder": function(buf) { return buf; }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "string",
            "label": "a sequence of unicode characters",
            "builder": function(val, bufb) {
                var encoded = new Buffer(val, 'utf8');
                if (encoded.length <= 0xFF) {
                    bufb.appendUInt8(0xA1);
                    bufb.appendUInt8(encoded.length);
                } else {
                    bufb.appendUInt8(0xB1);
                    bufb.appendUInt32BE(encoded.length);
                }
                bufb.appendBuffer(encoded);
            },
            "encodings": [
                {
                    "code": "0xa1",
                    "category": "variable",
                    "width": "1",
                    "label": "up to 2^8 - 1 octets worth of UTF-8 unicode (with no byte order mark)",
                    "decoder": function(buf) { return buf.slice(1).toString('utf8'); }
                },
                {
                    "code": "0xb1",
                    "category": "variable",
                    "width": "4",
                    "label": "up to 2^32 - 1 octets worth of UTF-8 unicode (with no byte order mark)",
                    "decoder": function(buf) { return buf.slice(4).toString('utf8'); }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "symbol",
            "label": "symbolic values from a constrained domain",
            "builder": function(val, bufb) {
                var encoded = new Buffer(val, 'utf8');
                if (encoded.length <= 0xFF) {
                    bufb.appendUInt8(0xA1);
                    bufb.appendUInt8(encoded.length);
                } else {
                    bufb.appendUInt8(0xB1);
                    bufb.appendUInt32BE(encoded.length);
                }
                bufb.appendBuffer(encoded);
            },
            "encodings": [
                {
                    "code": "0xa3",
                    "category": "variable",
                    "width": "1",
                    "label": "up to 2^8 - 1 seven bit ASCII characters representing a symbolic value",
                    "decoder": function(buf) {
                        /** @todo Work with ASCII instead of UTF8 */
                        return buf.slice(1).toString('utf8');
                    }
                },
                {
                    "code": "0xb3",
                    "category": "variable",
                    "width": "4",
                    "label": "up to 2^32 - 1 seven bit ASCII characters representing a symbolic value",
                    "decoder": function(buf) {
                        /** @todo Work with ASCII instead of UTF8 */
                        return buf.slice(4).toString('utf8');
                    }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "list",
            "label": "a sequence of polymorphic values",
            "builder": this._listBuilder,
            "encodings": [
                {
                    "code": "0x45",
                    "category": "fixed",
                    "width": "0",
                    "label": "the empty list (i.e. the list with no elements)",
                    "decoder": function(buf) { return []; }
                },
                {
                    "code": "0xc0",
                    "category": "compound",
                    "width": "1",
                    "label": "up to 2^8 - 1 list elements with total size less than 2^8 octets",
                    "decoder": function(buf, codec) { return self._listDecoder(1, buf, codec); }
                },
                {
                    "code": "0xd0",
                    "category": "compound",
                    "width": "4",
                    "label": "up to 2^32 - 1 list elements with total size less than 2^32 octets",
                    "decoder": function(buf, codec) { return self._listDecoder(4, buf, codec); }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "map",
            "label": "a polymorphic mapping from distinct keys to values",
            "builder": this._mapBuilder,
            "encodings": [
                {
                    "code": "0xc1",
                    "category": "compound",
                    "width": "1",
                    "label": "up to 2^8 - 1 octets of encoded map data",
                    "decoder": function(buf, codec) { return self._mapDecoder(1, buf, codec); }
                },
                {
                    "code": "0xd1",
                    "category": "compound",
                    "width": "4",
                    "label": "up to 2^32 - 1 octets of encoded map data",
                    "decoder": function(buf, codec) { return self._mapDecoder(4, buf, codec); }
                }
            ]
        },
        {
            "class": "primitive",
            "name": "array",
            "label": "a sequence of values of a single type",
            "builder": this._arrayBuilder,
            "encodings": [
                {
                    "code": "0xe0",
                    "category": "array",
                    "width": "1",
                    "label": "up to 2^8 - 1 array elements with total size less than 2^8 octets",
                    "decoder": function(buf, codec) { return self._arrayDecoder(1, buf, codec); }
                },
                {
                    "code": "0xf0",
                    "category": "array",
                    "width": "4",
                    "label": "up to 2^32 - 1 array elements with total size less than 2^32 octets",
                    "decoder": function(buf, codec) { return self._arrayDecoder(4, buf, codec); }
                }
            ]
        }
    ];
};

/**
 * Initialize all encoders and decoders based on type array.
 *
 * @private
 */
Types.prototype._initEncodersDecoders = function() {
    this.builders = {};
    this.decoders = {};
    for (var idx in this.typesArray) {
        var curType = this.typesArray[idx];
        this.builders[curType.name] = curType.builder;
        for (var encIdx in curType.encodings) {
            var curEnc = curType.encodings[encIdx];
            this.decoders[parseInt(curEnc.code)] = curEnc.decoder;
        }
    }
};

module.exports = new Types();