var process = require('process');
var fs = require('fs');
var _ = require('underscore');

var IndexCardReader = require('./IndexCardReader.js');
var SifConverter = require('./SifConverter.js');
var FileUtils = require('./FileUtils.js');

function main(args)
{
	var input = args[0];
	var output = args[1];
	var mapping = args[2];

	var reader = new IndexCardReader();

	// clear the output content first
	// this is because we use the append function later (not write)
	fs.truncateSync(output);

	var converter = new SifConverter(mapping);

	if (fs.lstatSync(input).isDirectory())
	{
		FileUtils.walkDir(input, function(err, files) {
			if (err)
			{
				throw err;
			}

			files = FileUtils.filterJson(files);
			processAllFiles(files, reader, converter, output);
		});
	}
	else
	{
		var pattern = null;

		if (reader.isJSONArray(input))
		{
			// in order to properly read an array of data we need "*" as pattern
			pattern = "*";
		}

		// read data from the input file
		reader.readCards(input, pattern, function (data) {
			// TODO remove duplicates
			_.each(data, function(indexCard, idx) {
				var sifNetwork = converter.convertToSif(indexCard);

				_.each(sifNetwork, function(sif, idx) {
					// write to output file
					fs.appendFileSync(output, sif + "\n");
				});
			});
		});
	}
}


function processAllFiles(files, reader, converter, output, callback)
{
	var filename = files.pop();

	var pattern = null;

	if (reader.isJSONArray(filename))
	{
		pattern = "*";
	}

	reader.readCards(filename, pattern, function (data)
	{
		_.each(data, function(indexCard, idx) {
			var sifNetwork = converter.convertToSif(indexCard);

			_.each(sifNetwork, function(sif, idx) {
				// write to output file
				fs.appendFileSync(output, sif + "\n");
			});
		});

		// more files to process
		if (files.length > 0)
		{
			processAllFiles(files, reader, converter, output, callback);
		}
		// finished processing all files
		else
		{
			if (_.isFunction(callback))
			{
				callback(converter, output);
			}
		}
	});
}

// argv[0]: node -- argv[1]: generateSifNetworks.js
main(process.argv.slice(2));
