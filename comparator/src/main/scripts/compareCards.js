var process = require('process');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardReader = require('./IndexCardReader.js');

function main(args)
{
	var inputFile = args[0];
	var reader = new IndexCardReader();

	reader.readCards(inputFile, function(data) {
		var comparator = new IndexCardComparator();
		comparator.compareCards(data);

		console.log("# of entities: " + data.length);
	});
}

// argv[0]: node -- argv[1]: compareCards.js
main(process.argv.slice(2));