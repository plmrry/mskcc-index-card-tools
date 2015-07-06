var process = require('process');
var fs = require('fs');
var _ = require('underscore');
var minimist = require('minimist');
var JSONStream = require('JSONStream');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardReader = require('./IndexCardReader.js');
var FileUtils = require('./FileUtils.js');

function main(args)
{
	var model = args["m"] || args["model"];
	var fragment = args["i"] || args["input"];
	var output = args["o"] || args["output"];
	var modelFilter = args["f"] || args["model-filter"];
	var fragmentFilter = args["g"] || args["fragment-filter"];

	if (model == null || fragment == null)
	{
		// TODO print usage
		invalidArgs();
		return 1;
	}

	var reader = new IndexCardReader();
	var comparator = new IndexCardComparator();

	var modelFiles;
	var modelData = [];

	if (fs.lstatSync(model).isDirectory())
	{
		FileUtils.walkDir(model, function(err, files) {
			if (err)
			{
				throw err;
			}

			// by default we only accept files ending with .json
			// (with the exclusion of a special ending: _mskcc.json)
			modelFiles = FileUtils.filterJson(files);

			// apply additional filename filters if provided
			if (modelFilter != null && modelFilter.length > 0)
			{
				modelFiles = FileUtils.filterCustom(modelFiles, function(filename) {
					return filename.match(modelFilter);
				})
			}

			processAllModels(modelFiles, reader, modelData, processModelData);
		});
	}
	else
	{
		modelFiles = [model];
		processAllModels(modelFiles, reader, modelData, processModelData);
	}

	function processModelData(modelData)
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

				// apply additional filename filters if provided
				if (fragmentFilter != null && fragmentFilter.length > 0)
				{
					files = FileUtils.filterCustom(files, function(filename) {
						return filename.match(fragmentFilter);
					})
				}

				processAllFragments(files, reader, comparator, output, printStats);
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
					generateOutput(output, result);
				}
				else
				{
					// write to std out
					generateOutput(process.stdout, result);
				}

				printStats(comparator, output);
			});
		}
	}
}

function processAllModels(files, reader, modelData, callback)
{
	var filename = files.pop();
	var pattern;

	if(reader.isJSONArray(filename))
	{
		// in order to properly read an array of data we need "*" as pattern
		// (assuming the data file contains a single JSON array)
		pattern = "*";
	}
	else
	{
		// in order to read a single JSON object we need "null" pattern
		pattern = null;
	}

	reader.readCards(filename, pattern, function (data) {
		if (_.isArray(data))
		{
			modelData = modelData.concat(data);
		}
		else
		{
			modelData.push(data);
		}


		// more files to process
		if (files.length > 0)
		{
			processAllModels(files, reader, modelData, callback);
		}
		// finished processing all files
		else
		{
			if (_.isFunction(callback))
			{
				callback(modelData);
			}
		}
	});
}

function processAllFragments(files, reader, comparator, output, callback)
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
		var outputFile;

		// assuming output is a directory too
		if (output == null)
		{
			// no output dir param, writing the output into input dir with a special suffix
			outputFile = filename.substr(0, filename.lastIndexOf(".")) + "_mskcc.json";
		}
		else
		{
			// TODO try to construct original input directory structure as well!
			// write to the specified output
			outputFile = output + "/" + filename.substr(filename.lastIndexOf("/"));
		}

		generateOutput(outputFile, result);

		// more files to process
		if (files.length > 0)
		{
			processAllFragments(files, reader, comparator, output, callback);
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

function generateOutput(output, json)
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

	// TODO move this into IndexCardReader (and rename the class to IndexCardIO)
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
	stringifier.write(outputJson);

	// close stream if it is not stdout
	if (writeStream !== process.stdout)
	{
		writeStream.end();
	}

	// using JSON.stringify for huge JSONs may fail
	//JSON.stringify(outputJson, null, 4);
}

function invalidArgs()
{
	console.log("ERROR: Invalid or missing arguments.\n");

	var usage = [];

	usage.push("Index Card Comparator Usage:");
	usage.push('-m, --model <path>:\tPath for the input model file or directory.');
	usage.push('-i, --input <path>:\tPath for the input fragment file or directory.');
	usage.push('-o, --output <path>:\tPath for the output file or directory.');
	usage.push('-f, --model-filter <regexp>:\tOptional filter for model filename.');
	usage.push('-g, --fragment-filter <regexp>:\tOptional filter for fragment filename.');

	console.log(usage.join("\n"));
}

// argv[0]: node -- argv[1]: compareCards.js
main(minimist(process.argv.slice(2)));
