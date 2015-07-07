var fs = require('fs');
var process = require('process');
//var system = require('system');
var _ = require('underscore');
var JSONStream = require('JSONStream');
var es = require('event-stream');

var IndexCardIO = function(options)
{
	var _defaultOpts = {
		detailedOutput: false
	};

	var _options = _.extend({}, _defaultOpts, options);

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
			console.log("[" + new Date() + "] finished processing input file, number of cards: " + cards.length);

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

	function generateOutputJson(json)
	{
		var outputJson = [];

		if (_.isArray(json))
		{
			_.each(json, function (ele, idx)
			{
				var clone = _.extend({}, ele);
				outputJson.push(clone);

				// remove match array
				if (!_options.detailedOutput)
				{
					delete clone.match;
				}
			});

			if (outputJson.length === 1)
			{
				outputJson = outputJson[0];
			}
		}
		else
		{
			outputJson = _.extend({}, json);
			// remove match array
			if (!_options.detailedOutput)
			{
				delete outputJson.match;
			}
		}

		return outputJson;
	}

	function writeCards(output, json)
	{
		var	writeStream;

		if (output === process.stdout)
		{
			writeStream = process.stdout;
		}
		else
		{
			writeStream = fs.createWriteStream(output, {encoding: 'utf8'});
		}

		var	stringifier = JSONStream.stringify(false, "\n", false, 4);
		stringifier.pipe(writeStream);
		stringifier.write(json);

		// close stream if it is not stdout
		if (writeStream !== process.stdout)
		{
			writeStream.end();
		}
	}

	/**
	 * Writes the given JSON object (an IndexCard
	 * @param output
	 * @param json
	 */
	function writeCardsWithoutStream(output, json)
	{
		// TODO if json is an array, then process each element separately
		// generating match file is tricky in case of an array...

		var outputJson = _.extend({}, json);

		// remove match array from the outputJson
		// (it might be too big to serialize)
		delete outputJson.match;

		// write the result without match array
		fs.writeFileSync(output, JSON.stringify(outputJson, null, 4));

		// if match array exists, then write into a separate file
		if (json.match != null)
		{
			var matchFile = output.substr(0, output.lastIndexOf(".")) + "_match.json";

			if (fs.existsSync(matchFile))
			{
				fs.truncateSync(matchFile);
			}

			fs.appendFileSync(matchFile, "[\n");

			_.each(json.match, function(matchInfo, idx) {
				fs.appendFileSync(matchFile,
				                  JSON.stringify(matchInfo, null, 4));

				if (idx < json.match.length - 1)
				{
					fs.appendFileSync(matchFile, ",\n");
				}
			});

			fs.appendFileSync(matchFile, "\n]\n");
		}
	}

	function writeWithoutStream(output, json)
	{
		writeCardsWithoutStream(output, generateOutputJson(json));
	}

	function writeWithStream(output, json)
	{
		writeCards(output, generateOutputJson(json));
	}

	this.readCards = readCards;
	this.isJSONArray = isJSONArray;
	this.generateOutputJson = generateOutputJson;
	this.writeCards = writeCards;
	this.writeCardsWithoutStream = writeCardsWithoutStream;
	this.writeWithoutStream = writeWithoutStream;
	this.writeWithStream = writeWithStream;
};

module.exports = IndexCardIO;
