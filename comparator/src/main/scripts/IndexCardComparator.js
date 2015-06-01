var _ = require('underscore');

var IndexCardComparator = function()
{
	var _paIdMap = {};
	var _pbIdMap = {};

	/**
	 * Compares IndexCard arrays and generate IndexCards with
	 * the comparison results.
	 *
	 * @param pcCards           array of IndexCards (from Pathway Commons)
	 * @param inferenceCards    array of IndexCards to add comparison result
	 * @return {Array} an array of IndexCard JSONs with valid model_relation field
	 */
	function compareCards(pcCards, inferenceCards)
	{
		// process pc cards to generate maps
		_.each(pcCards, function(pcCard, idx) {
			updateIdMap(_paIdMap, participantA(pcCard), pcCard);
			updateIdMap(_pbIdMap, participantB(pcCard), pcCard);
		});

		// for each inference card find matching PC card(s)
		_.each(inferenceCards, function(inferenceCard, idx) {
			// TODO find matching cards using the maps
		});
	}

	/**
	 *
	 * @param pcCard
	 * @param inferenceCard
	 */
	function isMatch(pcCard, inferenceCard)
	{

	}

	/**
	 * Update the given map by using the given field value as a key.
	 *
	 * @param idMap         map to be updated
	 * @param participant   participant object (can be an array in case of complex)
	 * @param indexCard     index card that the participant belongs
	 */
	function updateIdMap(idMap, participant, indexCard)
	{
		// if participant is an array then it is a complex
		if (_.isArray(participant))
		{
			_.each(participant, function(ele, idx) {
				updateIdMap(idMap, ele, indexCard);
			});
		}
		// if entity type is protein family,
		// then we need to use family_members array
		else if (participant["entity_type"] == "protein_family" &&
		         participant["family_members"] != null)
		{
			_.each(participant["family_members"], function(ele, idx) {
				updateIdMap(idMap, ele, indexCard);
			});
		}
		// else it is a simple participant
		else
		{
			var id = participant["identifier"];

			// if the identifier field exists
			if (id != null)
			{
				if (idMap[id] == null)
				{
					idMap[id] = [];
				}

				idMap[id].push(indexCard);
			}
		}
	}

	function participantA(indexCard)
	{
		return indexCard["extracted_information"]["participant_a"];
	}

	function participantB(indexCard)
	{
		return indexCard["extracted_information"]["participant_b"];
	}

	// public functions
	this.compareCards = compareCards;
};

module.exports = IndexCardComparator;
