var assert = require('assert');
var util = require('util');
var async = require('async');
var utils = require('../../lib/utils.js');

var types = require('../../lib/types');
var encoder = require('../../lib/encoder.js');
var dataTypes = types.dataTypes;
var helper = require('../test-helper.js');

describe('encoder', function () {
  describe('#guessDataType()', function () {
    it('should guess the native types', function () {
      assertGuessed(1, dataTypes.double, 'Guess type for an integer (double) number failed');
      assertGuessed(1.01, dataTypes.double, 'Guess type for a double number failed');
      assertGuessed(true, dataTypes.boolean, 'Guess type for a boolean value failed');
      assertGuessed([1,2,3], dataTypes.list, 'Guess type for an Array value failed');
      assertGuessed('a string', dataTypes.text, 'Guess type for an string value failed');
      assertGuessed(new Buffer('bip bop'), dataTypes.blob, 'Guess type for a buffer value failed');
      assertGuessed(new Date(), dataTypes.timestamp, 'Guess type for a Date value failed');
      assertGuessed(new types.Long(10), dataTypes.bigint, 'Guess type for a Int 64 value failed');
      assertGuessed(types.uuid(), dataTypes.uuid, 'Guess type for a UUID value failed');
      assertGuessed(types.timeuuid(), dataTypes.uuid, 'Guess type for a Timeuuid value failed');
      assertGuessed(types.Integer.fromNumber(1), dataTypes.varint, 'Guess type for a varint value failed');
      assertGuessed(types.Integer.fromBuffer(new Buffer([0xff])), dataTypes.varint, 'Guess type for a varint value failed');
      assertGuessed({}, null, 'Objects must not be guessed');
    });

    function assertGuessed(value, expectedType, message) {
      var typeInfo = encoder.guessDataType(value);
      if (typeInfo === null) {
        if (expectedType !== null) {
          assert.ok(false, 'Type not guessed for value ' + value);
        }
        return;
      }
      assert.strictEqual(typeInfo.type, expectedType, message + ': ' + value);
    }
  });
  describe('#encode() and #decode', function () {
    var typeEncoder = encoder;
    it('should encode and decode maps', function () {
      var value = {value1: 'Surprise', value2: 'Madafaka'};
      //Minimum info, guessed
      var encoded = typeEncoder.encode(value, dataTypes.map);
      var decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.text], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
      //Minimum info, guessed
      value = {value1: 1.1, valueN: 1.2};
      encoded = typeEncoder.encode(value, dataTypes.map);
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.text], [dataTypes.double]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
      //Minimum info string, guessed
      value = {value1: new Date(9999999), valueN: new Date(5555555)};
      encoded = typeEncoder.encode(value, 'map');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.text], [dataTypes.timestamp]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
      //Minimum info string, guessed
      value = {};
      value[types.uuid()] = 0;
      value[types.uuid()] = 2;
      encoded = typeEncoder.encode(value, 'map');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.uuid], [dataTypes.double]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
      //full info string
      value = {value1: 1, valueN: -3};
      encoded = typeEncoder.encode(value, 'map<text,int>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.text], [dataTypes.int]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
      //full info typeInfo
      value = {value1: 1, valueN: -33892};
      encoded = typeEncoder.encode(value, {type: dataTypes.map, subtypes: [dataTypes.string, dataTypes.int]});
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.text], [dataTypes.int]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode and decode maps with stringified keys', function () {
      var value = {};
      value[new Date(1421756675488)] = 'date1';
      value[new Date(1411756633461)] = 'date2';

      var encoded = typeEncoder.encode(value, {type: dataTypes.map, subtypes: [dataTypes.timestamp, dataTypes.text]});
      var decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.timestamp], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));

      value = {};
      value[101] = 'number1';
      value[102] = 'number2';
      encoded = typeEncoder.encode(value, 'map<int, text>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.int], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));

      value = {};
      value[types.Long.fromBits(0x12002001, 0x7f999299)] = 'bigint1';
      value[types.Long.fromBits(0x12002000, 0x7f999299)] = 'bigint2';
      encoded = typeEncoder.encode(value, 'map<bigint, text>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.bigint], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));

      value = {};
      value['201'] = 'bigint1_1';
      value['202'] = 'bigint2_1';
      encoded = typeEncoder.encode(value, 'map<bigint, text>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.bigint], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));

      value = {};
      value['2d5db74c-c2da-4e59-b5ec-d8ad3d0aefb9'] = 'uuid1';
      value['651b5c17-5357-4764-ae2d-21c409288822'] = 'uuid2';
      encoded = typeEncoder.encode(value, 'map<uuid, text>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.uuid], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));

      value = {};
      value['1ab50440-a0ab-11e4-9d01-1dc0e727b460'] = 'timeuuid1';
      value['1820c4d0-a0ab-11e4-9d01-1dc0e727b460'] = 'timeuuid2';
      encoded = typeEncoder.encode(value, 'map<timeuuid, text>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.timeuuid], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));

      value = {};
      value['988229782938247303441911118'] = 'varint1';
      value['988229782938247303441911119'] = 'varint2';
      encoded = typeEncoder.encode(value, 'map<varint, text>');
      decoded = typeEncoder.decode(encoded, [dataTypes.map, [[dataTypes.varint], [dataTypes.text]]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode and decode list<int>', function () {
      var value = [1, 2, 3, 4];
      var encoded = typeEncoder.encode(value, 'list<int>');
      var decoded = typeEncoder.decode(encoded, [dataTypes.list, [dataTypes.int]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode and decode a guessed double', function () {
      var value = 1111;
      var encoded = typeEncoder.encode(value);
      var decoded = typeEncoder.decode(encoded, [dataTypes.double]);
      assert.strictEqual(decoded, value);
    });
    it('should encode and decode a guessed string', function () {
      var value = 'Pennsatucky';
      var encoded = typeEncoder.encode(value);
      var decoded = typeEncoder.decode(encoded, [dataTypes.text]);
      assert.strictEqual(decoded, value);
    });
    it('should encode and decode list<double>', function () {
      var value = [1, 2, 3, 100];
      var encoded = typeEncoder.encode(value, 'list<double>');
      var decoded = typeEncoder.decode(encoded, [dataTypes.list, [dataTypes.double]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode and decode list<double> without hint', function () {
      var value = [1, 2, 3, 100.1];
      var encoded = typeEncoder.encode(value);
      var decoded = typeEncoder.decode(encoded, [dataTypes.list, [dataTypes.double]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode and decode set<text>', function () {
      var value = ['Alex Vause', 'Piper Chapman', '3', '4'];
      var encoded = typeEncoder.encode(value, 'set<text>');
      var decoded = typeEncoder.decode(encoded, [dataTypes.set, [dataTypes.text]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
      //with type info
      encoded = typeEncoder.encode(value, {type: dataTypes.set, subtypes: [dataTypes.text]});
      decoded = typeEncoder.decode(encoded, [dataTypes.set, [dataTypes.text]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode and decode list<float> with typeInfo', function () {
      var value = [1.1122000217437744, 2.212209939956665, 3.3999900817871094, 4.412120819091797, -1000, 1];
      var encoded = typeEncoder.encode(value, {type: dataTypes.list, subtypes: [dataTypes.float]});
      var decoded = typeEncoder.decode(encoded, [dataTypes.list, [dataTypes.float]]);
      assert.strictEqual(util.inspect(decoded), util.inspect(value));
    });
    it('should encode undefined as null', function () {
      var hinted = typeEncoder.encode(undefined, 'set<text>');
      var unHinted = typeEncoder.encode();
      assert.strictEqual(hinted, null);
      assert.strictEqual(unHinted, null);
    });
    it('should throw on unknown types', function () {
      assert.throws(function () {
        typeEncoder.encode({});
      }, TypeError);
    });
    it('should throw when the typeInfo and the value source type does not match', function () {
      assert.throws(function () {
        typeEncoder.encode('hello', 'int');
      }, TypeError);
      assert.throws(function () {
        typeEncoder.encode('1.1', 'float');
      }, TypeError);
      assert.throws(function () {
        typeEncoder.encode(100, dataTypes.uuid);
      }, TypeError);
      assert.throws(function () {
        typeEncoder.encode(200, dataTypes.timeuuid);
      }, TypeError);
      assert.throws(function () {
        typeEncoder.encode('Its anybody in there? I know that you can hear me', dataTypes.blob);
      }, TypeError);
      assert.throws(function () {
        typeEncoder.encode(100, dataTypes.blob);
      }, TypeError);
      assert.throws(function () {
        typeEncoder.encode({}, dataTypes.list);
      }, TypeError);
    });
    it('should encode Long/Date/Number/String as timestamps', function () {
      var buffer = encoder.encode(types.Long.fromBits(0x00fafafa, 0x07090909), dataTypes.timestamp);
      assert.strictEqual(buffer.toString('hex'), '0709090900fafafa');
      buffer = encoder.encode(1421755130012, dataTypes.timestamp);
      assert.strictEqual(buffer.toString('hex'), '0000014b0735a09c');
      buffer = encoder.encode(new Date(1421755130012), dataTypes.timestamp);
      assert.throws(function () {
        encoder.encode(new Date('This is an invalid date string'), dataTypes.timestamp);
      }, TypeError);
      assert.strictEqual(buffer.toString('hex'), '0000014b0735a09c');
      buffer = encoder.encode(new Date(1421755130012), dataTypes.timestamp);
      assert.strictEqual(buffer.toString('hex'), '0000014b0735a09c');
      buffer = encoder.encode('Tue Jan 20 2015 13:00:35 GMT+0100 (CET)', dataTypes.timestamp);
      assert.strictEqual(buffer.toString('hex'), '0000014b07373ab8');
      assert.throws(function () {
        encoder.encode('This is an invalid date string', dataTypes.timestamp);
      }, TypeError);
    });
    it('should encode String/Number (not NaN) as int', function () {
      var buffer = encoder.encode(0x071272ab, dataTypes.int);
      assert.strictEqual(buffer.toString('hex'), '071272ab');
      buffer = encoder.encode('0x071272ab', dataTypes.int);
      assert.strictEqual(buffer.toString('hex'), '071272ab');
      buffer = encoder.encode(-1, 'int');
      assert.strictEqual(buffer.toString('hex'), 'ffffffff');
      buffer = encoder.encode('-1', 'int');
      assert.strictEqual(buffer.toString('hex'), 'ffffffff');
      buffer = encoder.encode(0, 'int');
      assert.strictEqual(buffer.toString('hex'), '00000000');
      buffer = encoder.encode('0', 'int');
      assert.strictEqual(buffer.toString('hex'), '00000000');
      assert.throws(function () {
        encoder.encode(NaN, 'int');
      }, TypeError);
    });
    it('should encode String/Long/Number as bigint', function () {
      var buffer = encoder.encode(types.Long.fromString('506946367331695353'), dataTypes.bigint);
      assert.strictEqual(buffer.toString('hex'), '0709090900fafaf9');
      buffer = encoder.encode('506946367331695353', dataTypes.bigint);
      assert.strictEqual(buffer.toString('hex'), '0709090900fafaf9');
      buffer = encoder.encode(0, dataTypes.bigint);
      assert.strictEqual(buffer.toString('hex'), '0000000000000000');
      buffer = encoder.encode(255, dataTypes.bigint);
      assert.strictEqual(buffer.toString('hex'), '00000000000000ff');
    });
    it('should encode String/Integer/Number as varint', function () {
      var buffer = encoder.encode(types.Integer.fromString('33554433'), dataTypes.varint);
      assert.strictEqual(buffer.toString('hex'), '02000001');
      buffer = encoder.encode('-150012', dataTypes.varint);
      assert.strictEqual(buffer.toString('hex'), 'fdb604');
      buffer = encoder.encode('-1000000000012', dataTypes.varint);
      assert.strictEqual(buffer.toString('hex'), 'ff172b5aeff4');
      buffer = encoder.encode(-128, dataTypes.varint);
      assert.strictEqual(buffer.toString('hex'), '80');
      buffer = encoder.encode(-100, dataTypes.varint);
      assert.strictEqual(buffer.toString('hex'), '9c');
    });
  });
  describe('#setRoutingKey', function () {
    it('should concat Array of buffers in the correct format',function () {
      var options = {
        routingKey: [new Buffer([1]), new Buffer([2]), new Buffer([3, 3])]
      };
      encoder.setRoutingKey([1, 'text'], options);
      assert.strictEqual(options.routingKey.toString('hex'), '00010100000102000002030300');

      options = {
        routingKey: [new Buffer([1])]
      };
      encoder.setRoutingKey([1, 'text'], options);
      assert.strictEqual(options.routingKey.toString('hex'), '01');
    });
    it('should not affect Buffer routing keys', function () {
      var options = {
        routingKey: new Buffer([1, 2, 3, 4])
      };
      var initialRoutingKey = options.routingKey.toString('hex');
      encoder.setRoutingKey([1, 'text'], options);
      assert.strictEqual(options.routingKey.toString('hex'), initialRoutingKey);

      options = {
        routingIndexes: [1],
        routingKey: new Buffer([1, 2, 3, 4])
      };
      encoder.setRoutingKey([1, 'text'], options);
      assert.strictEqual(options.routingKey.toString('hex'), initialRoutingKey);
    });
    it('should build routing key based on routingIndexes', function () {
      var options = {
        hints: ['int'],
        routingIndexes: [0]
      };
      encoder.setRoutingKey([1], options);
      assert.strictEqual(options.routingKey.toString('hex'), '00000001');

      options = {
        hints: ['int', 'string', 'int'],
        routingIndexes: [0, 2]
      };
      encoder.setRoutingKey([1, 'yeah', 2], options);
      //length1 + buffer1 + 0 + length2 + buffer2 + 0
      assert.strictEqual(options.routingKey.toString('hex'), '0004' + '00000001' + '00' + '0004' + '00000002' + '00');

      options = {
        //less hints
        hints: ['int'],
        routingIndexes: [0, 2]
      };
      encoder.setRoutingKey([1, 'yeah', new Buffer([1, 1, 1, 1])], options);
      //length1 + buffer1 + 0 + length2 + buffer2 + 0
      assert.strictEqual(options.routingKey.toString('hex'), '0004' + '00000001' + '00' + '0004' + '01010101' + '00');
      options = {
        //no hints
        routingIndexes: [1, 2]
      };
      encoder.setRoutingKey([1, 'yeah', new Buffer([1, 1, 1, 1])], options);
      //length1 + buffer1 + 0 + length2 + buffer2 + 0
      assert.strictEqual(options.routingKey.toString('hex'), '0004' + new Buffer('yeah').toString('hex') + '00' + '0004' + '01010101' + '00');
    });
    it('should throw if the type could not be encoded', function () {
      assert.throws(function () {
        var options = {
          routingIndexes: [0]
        };
        encoder.setRoutingKey([{a: 1}], options);
      }, TypeError);
      assert.throws(function () {
        var options = {
          hints: ['int'],
          routingIndexes: [0]
        };
        encoder.setRoutingKey(['this is text'], options);
      }, TypeError);
    });
  });
});