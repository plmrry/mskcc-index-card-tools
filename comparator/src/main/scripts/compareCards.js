var process = require('process');
var fs = require('fs');
var _ = require('underscore');
var minimist = require('minimist');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardReader = require('./IndexCardReader.js');
var FileUtils = require('./FileUtils.js');

function main(args)
{
	var modelFile = args["m"] || args["model"];
	var fragment = args["i"] || args["input"];
	var output = args["o"] || args["output"];

	if (modelFile == null || fragment == null)
	{
		// TODO print usage
		invalidArgs();
		return 1;
	}

	var reader = new IndexCardReader();
	var comparator = new IndexCardComparator();

	var modelPattern;

	if(reader.isJSONArray(modelFile))
	{
		// in order to properly read an array of data we need "*" as pattern
		// (assuming the data file contains a single JSON array)
		modelPattern = "*";
	}
	else
	{
		// in order to read a single JSON object we need "null" pattern
		modelPattern = null;
	}

	// read model data from the model input file.
	reader.readCards(modelFile, modelPattern, function (modelData)
	{
		comparator.loadModel(modelData);

		// if fragment input is a directory, process each file separately
		if (fs.lstatSync(fragment).isDirectory())
		{
			FileUtils.walkDir(fragment, function(err, files) {
				if (err)
				{
					throw err;
				}

				files = FileUtils.filterJson(files);
				processAllFiles(files, reader, comparator, output, printStats);
			});
		}
		else
		{
			var fragmentPattern = null;

			if(reader.isJSONArray(fragment))
			{
				// in order to properly read an array of data we need "*" as pattern
				fragmentPattern = "*";
			}

			reader.readCards(fragment, fragmentPattern, function (inferenceData)
			{
				var result = comparator.compareCards(inferenceData);

				// assuming output is a file
				if (output != null)
				{
					fs.writeFileSync(output, generateOutput(result));
				}
				else
				{
					// write to std out
					console.log(generateOutput(result));
				}

				printStats(comparator, output);
			});
		}
	});
}

function processAllFiles(files, reader, comparator, output, callback)
{
	var filename = files.pop();

	var pattern = null;

	if (reader.isJSONArray(filename))
	{
		pattern = "*";
	}

	reader.readCards(filename, pattern, function (inferenceData)
	{
		var result = comparator.compareCards(inferenceData);

		// assuming output is a directory too
		if (output == null)
		{
			// no output dir param, writing the output into input dir with a special suffix
			var outputFile = filename.substr(0, filename.lastIndexOf(".")) + "_mskcc.json";
		}
		else
		{
			// TODO try to construct original input directory structure as well!
			// write to the specified output
			var outputFile = output + "/" + filename.substr(filename.lastIndexOf("/"));
		}

		fs.writeFileSync(outputFile, generateOutput(result));

		// more files to process
		if (files.length > 0)
		{
			processAllFiles(files, reader, comparator, output, callback);
		}
		// finished processing all files
		else
		{
			if (_.isFunction(callback))
			{
				callback(comparator, output);
			}
		}
	});
}

function printStats(comparator, output)
{
	var stats = comparator.getStats();
	console.log("STATS: ");
	console.log(JSON.stringify(stats, null, 4));
}

function generateOutput(json)
{
	var outputJson = [];

	if (_.isArray(json))
	{
		_.each(json, function(ele, idx) {
			var clone = _.extend({}, ele);
			outputJson.push(clone);
			// remove match array (comment out for debug)
			delete clone.match;
		});

		if (outputJson.length === 1)
		{
			outputJson = outputJson[0];
		}
	}
	else
	{
		outputJson = _.extend({}, json);
		// remove match array (comment out for debug)
		delete outputJson.match;
	}

	return JSON.stringify(outputJson, null, 4);
}

function invalidArgs()
{
	console.log("ERROR: Invalid or missing arguments.\n");

	var usage = [];

	usage.push("Index Card Comparator Usage:");
	usage.push('-m, --model <path>:\tPath for the input model file or directory.');
	usage.push('-i, --input <path>:\tPath for the input fragment file or directory.');
	usage.push('-o, --output <path>:\tPath for the output file or directory.');

	console.log(usage.join("\n"));
}

// argv[0]: node -- argv[1]: compareCards.js
main(minimist(process.argv.slice(2)));