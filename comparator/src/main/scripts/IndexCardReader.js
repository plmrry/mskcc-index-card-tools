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

	this.readCards = readCards;
};

module.exports = IndexCardReader;
