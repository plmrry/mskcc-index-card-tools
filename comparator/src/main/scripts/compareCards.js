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
	var detailedOutput = args["d"] || args["detailed-output"];

	if (model == null || fragment == null)
	{
		invalidArgs();
		return 1;
	}

	var processor = new IndexCardReader({detailedOutput: detailedOutput});
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

			processAllModels(modelFiles, processor, modelData, processModelData);
		});
	}
	else
	{
		modelFiles = [model];
		processAllModels(modelFiles, processor, modelData, processModelData);
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

				processAllFragments(files, processor, comparator, output, printStats);
			});
		}
		// single file
		else
		{
			var fragmentPattern = null;

			if(processor.isJSONArray(fragment))
			{
				// in order to properly read an array of data we need "*" as pattern
				fragmentPattern = "*";
			}

			processor.readCards(fragment, fragmentPattern, function (inferenceData)
			{
				var result = comparator.compareCards(inferenceData);

				// TODO if the JSON is too big we still get RangeError...
				// find a proper way to write with a stream

				// assuming output is a file
				if (output != null)
				{
					processor.writeWithStream(output, result);
				}
				else
				{
					// write to std out
					processor.writeWithStream(process.stdout, result);
				}

				printStats(comparator, output);
			});
		}
	}
}

function processAllModels(files, processor, modelData, callback)
{
	var filename = files.pop();
	var pattern;

	if(processor.isJSONArray(filename))
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

	processor.readCards(filename, pattern, function (data) {
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
			processAllModels(files, processor, modelData, callback);
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

function processAllFragments(files, processor, comparator, output, callback)
{
	var filename = files.pop();

	var pattern = null;

	if (processor.isJSONArray(filename))
	{
		pattern = "*";
	}

	processor.readCards(filename, pattern, function (inferenceData)
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

		// this generates an additional _match.json file
		// TODO find a way to write with streams without generating separate _match.json files
		processor.writeWithoutStream(outputFile, result);

		// more files to process
		if (files.length > 0)
		{
			processAllFragments(files, processor, comparator, output, callback);
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
	usage.push('-d, --detailed-output:\tOptional flag to indicate output files with details.');

	console.log(usage.join("\n"));
}

// argv[0]: node -- argv[1]: compareCards.js
main(minimist(process.argv.slice(2)));
