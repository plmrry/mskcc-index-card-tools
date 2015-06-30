var process = require('process');
var fs = require('fs');
var _ = require('underscore');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardReader = require('./IndexCardReader.js');
var FileUtils = require('./FileUtils.js');

function main(args)
{
	var modelFile = args[0];
	var fragment = args[1];
	var output = args[2];

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
		if (output != null)
		{
			// TODO ignoring the output dir param for now, and writing the output into input dir
			//var outputFile = output + "/" + filename.substr(filename.lastIndexOf("/"));
			var outputFile = filename.substr(0, filename.lastIndexOf(".")) + "_mskcc.json";
			fs.writeFileSync(outputFile, generateOutput(result));
		}
		else
		{
			// write to std out
			console.log(generateOutput(result));
		}

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

// argv[0]: node -- argv[1]: compareCards.js
main(process.argv.slice(2));