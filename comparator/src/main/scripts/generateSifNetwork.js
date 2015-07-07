var process = require('process');
var fs = require('fs');
var _ = require('underscore');
var minimist = require('minimist');

var IndexCardIO = require('./IndexCardIO.js');
var SifConverter = require('./SifConverter.js');
var FileUtils = require('./FileUtils.js');

function main(args)
{
	var mapping = args["h"] || args["hgnc-mapping"];
	var input = args["i"] || args["input"];
	var output = args["o"] || args["output"];

	if (input == null || output == null || mapping == null)
	{
		invalidArgs();
		return 1;
	}

	var processor = new IndexCardIO();

	// clear the output content first
	// this is because we use the append function later (not write)
	if (fs.existsSync(output))
	{
		fs.truncateSync(output);
	}

	var converter = new SifConverter(mapping);

	if (fs.lstatSync(input).isDirectory())
	{
		FileUtils.walkDir(input, function(err, files) {
			if (err)
			{
				throw err;
			}

			files = FileUtils.filterJson(files);

			processAllFiles(files, processor, converter, output, function(converter, output) {
				_.each(converter.network(), function(sif, idx) {
					// write to output file
					fs.appendFileSync(output, sif + "\n");
				});
			});
		});
	}
	else
	{
		var pattern = null;

		if (processor.isJSONArray(input))
		{
			// in order to properly read an array of data we need "*" as pattern
			pattern = "*";
		}

		// read data from the input file
		processor.readCards(input, pattern, function (data) {
			_.each(data, function(indexCard, idx) {
				var sifNetwork = converter.convertToSif(indexCard);
				converter.updateNetwork(sifNetwork);
			});

			_.each(converter.network(), function(sif, idx) {
				// write to output file
				fs.appendFileSync(output, sif + "\n");
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
			converter.updateNetwork(sifNetwork);
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

function invalidArgs()
{
	console.log("ERROR: Invalid or missing arguments.\n");

	var usage = [];

	usage.push("Index Card SIF Converter Usage:");
	usage.push('-i, --input <path>:\tPath for the input JSON file or directory.');
	usage.push('-o, --output <path>:\tPath for the output SIF file.');
	usage.push('-h, --model <path>:\tPath for the HGNC to Uniprot mapping file.');

	console.log(usage.join("\n"));
}

// argv[0]: node -- argv[1]: generateSifNetworks.js
main(minimist(process.argv.slice(2)));
