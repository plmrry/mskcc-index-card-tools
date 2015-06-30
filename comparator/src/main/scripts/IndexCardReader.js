var fs = require('fs');
//var system = require('system');
var _ = require('underscore');
var JSONStream = require('JSONStream');
var es = require('event-stream');

var IndexCardReader = function()
{
	/**
	 *
	 * @param filename  input file
	 * @param pattern   parse pattern (filter)
	 * @param callback  callback function to be invoked on parse end
	 */
	function readCards(filename, pattern, callback)
	{
		var cards = [];

		console.log("[" + new Date() + "] started processing input file: " + filename);

		var	readStream = fs.createReadStream(filename, {encoding: 'utf8'});
		var	parser = JSONStream.parse(pattern);
		readStream.pipe(parser);

		parser.on('data', function(data) {
			cards.push(data);
		});

		parser.on('end', function() {
			console.log("[" + new Date() + "] finished processing input file: " + filename);

			if (_.isFunction(callback))
			{
				callback(cards);
			}
		});
	}

	function isJSONArray(filename)
	{
		var done = false;
		var firstChar = null;
		var bufLen = 100;
		var fd = fs.openSync(filename, 'r');

		while (!done)
		{
			var buffer = new Buffer(bufLen);
			fs.readSync(fd, buffer, 0, bufLen);

			var data = buffer.toString();

			if (data.trim().length > 0)
			{
				done = true;
				firstChar = data.trim()[0];
			}
		}

		fs.closeSync(fd);

		if (firstChar == "[")
		{
			return true;
		}
	}

	this.readCards = readCards;
	this.isJSONArray = isJSONArray;
};

module.exports = IndexCardReader;
