var process = require('process');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardReader = require('./IndexCardReader.js');

function main(args)
{
	var pcFile = args[0];
	var inferenceFile = args[1];
	var reader = new IndexCardReader();

	reader.readCards(inferenceFile, function(inferenceData) {
		reader.readCards(pcFile, function(pcData) {
			var comparator = new IndexCardComparator();
			comparator.compareCards(pcData, inferenceData);
		});
	});
}

// argv[0]: node -- argv[1]: compareCards.js
main(process.argv.slice(2));