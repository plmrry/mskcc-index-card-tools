var _ = require('underscore');
var fs = require('fs');

var IndexCardUtils = require('./IndexCardUtils.js');

var SifConverter = function(mappingFile)
{
	var _hgncMap = buildHgncMap(mappingFile);
	var _network = {};

	/**
	 *
	 * @param indexCard
	 */
	function convertToSif(indexCard)
	{
		var network = [];

		var aIds = IndexCardUtils.extractAllIds(
			IndexCardUtils.participantA(indexCard));

		var bIds = IndexCardUtils.extractAllIds(
			IndexCardUtils.participantB(indexCard));

		var type = IndexCardUtils.interactionType(indexCard);
		var interaction = "is-upstream-of";

		if (type.toLowerCase() == "binds")
		{
			interaction = "in-complex-with";
		}

		_.each(aIds, function(aId, idx) {
			_.each(bIds, function(bId, idx) {
				// skip ungrounded and non mapped
				var aHgnc = _hgncMap[IndexCardUtils.normalizeId(aId)];
				var bHgnc = _hgncMap[IndexCardUtils.normalizeId(bId)];

				if (isValidId(aId) &&
				    isValidId(bId) &&
				    isValidId(aHgnc) &&
				    isValidId(bHgnc))
				{
					network.push(aHgnc + "\t" + interaction + "\t" + bHgnc);
				}
			});
		});

		return network;
	}

	function buildHgncMap(filename)
	{
		var content = fs.readFileSync(filename).toString();
		var map = {};

		if (content && content.length > 0)
		{
			var lines = content.split("\n");

			_.each(lines, function(line, idx) {
				if (line && line.length > 0)
				{
					var parts = line.split("\t");

					var hgncSymbol = parts[0];
					var synonyms = parts[1];
					var uniprotId = parts[2];

					map[uniprotId.toLowerCase()] = hgncSymbol;
				}
			});
		}

		return map;
	}

	function isValidId(id)
	{
		return (id &&
		        id.length > 0 &&
		        id.toLowerCase() != "ungrounded");
	}

	function updateNetwork(sifNetwork)
	{
		_.each(sifNetwork, function(sif, idx) {
			// update network
			_network[sif] = sif;
		});
	}

	function network()
	{
		return _.values(_network);
	}

	this.updateNetwork = updateNetwork;
	this.convertToSif = convertToSif;
	this.network = network;
};

module.exports = SifConverter;