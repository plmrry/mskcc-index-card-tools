var _ = require('underscore');

var IndexCardUtils = require('./IndexCardUtils.js');

var SifConverter = function(mappingFile)
{
	var _hgncMap = buildHgncMap(mappingFile);

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

		// TODO uniprot -> HGNC symbol
		// TODO skip ungrounded

		_.each(aIds, function(aId, idx) {
			_.each(bIds, function(bId, idx) {
				network.push(aId + "\t" + interaction + "\t" + bId);
			});
		});

		return network;
	}

	function buildHgncMap(filename)
	{
		// TODO build the map
		return {};
	}

	this.convertToSif = convertToSif;
};

module.exports = SifConverter;