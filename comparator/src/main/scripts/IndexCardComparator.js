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
		var updatedCards = [];

		// process pc cards to generate maps
		_.each(pcCards, function(pcCard, idx) {
			updateIdMap(_paIdMap, participantA(pcCard), pcCard);
			updateIdMap(_pbIdMap, participantB(pcCard), pcCard);
		});

		// TODO currently we ignore participant A...
		// for each inference card find matching PC card(s)
		_.each(inferenceCards, function(inferenceCard, idx) {
			// find matching cards for the participant b
			var familyMembersFn = null; // TODO define a proper function
			var queryIds = extractAllIds(participantB(inferenceCard), familyMembersFn);
			var matchingCards = findMatchingCards(queryIds, inferenceCard, _pbIdMap);
			var updatedCard = findModelRelation(inferenceCard, matchingCards);
			updatedCards.push(updatedCard);
		});

		return updatedCards;
	}

	function findModelRelation(indexCard, matchingCards)
	{
		// TODO determine model relation wrt interaction type
		if (hasModification(indexCard))
		{
			var modifications = getModifications(indexCard);

			// get all modifications from the matching cards
			var matchingModifications = [];

			_.each(matchingCards, function(card, idx) {
				if (hasModification(card))
				{
					matchingModifications = matchingModifications.concat(getModifications(card));
				}
			});

			// remove duplicates (if any)
			matchingModifications = _.uniq(matchingModifications, function(ele) {
				// this is required to make a deep object comparison
				// another way would be to use _.isEqual() but _.uniq() does not
				// get a comparator function as a parameter
				return JSON.stringify(ele);
			});

			// TODO determine the model relation by comparing matchingModifications to modifications
		}

		return indexCard;
	}

	function hasModification(indexCard)
	{
		return (getModifications(indexCard) != null) &&
		       (getModifications(indexCard).length > 0);
	}

	function getModifications(indexCard)
	{
		return indexCard["extracted_information"]["modifications"];
	}

	/**
	 *
	 * @param queryIds
	 * @param inferenceCard
	 * @param idMap
	 */
	function findMatchingCards(queryIds, inferenceCard, idMap)
	{
		var matchingCards = [];

		_.each(queryIds, function(id, idx) {
			_.each(idMap[id], function(card, idx) {
				if (inferenceCard["interaction_type"] === card["interaction_type"])
				{
					matchingCards.push(card);
				}
			});
		});

		return matchingCards;
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
		var ids = extractAllIds(participant);

		_.each(ids, function(id, idx) {
			if (id != null)
			{
				if (idMap[id] == null)
				{
					idMap[id] = [];
				}

				idMap[id].push(indexCard);
			}
		});
	}

	function extractAllIds(participant, familyMembersFn)
	{
		// set a default family member extraction function if none provided
		familyMembersFn = familyMembersFn || function(participant) {
			return participant["family_members"];
		};

		var ids = [];
		var familyMembers = familyMembersFn(participant);

		// if participant is an array then it is a complex
		if (_.isArray(participant))
		{
			_.each(participant, function(ele, idx) {
				ids = ids.concat(extractAllIds(ele, familyMembersFn));
			});
		}
		// if entity type is protein family,
		// then we need to use family_members array
		else if (participant["entity_type"] == "protein_family" &&
		         familyMembers != null)
		{
			_.each(familyMembers, function(ele, idx) {
				ids = ids.concat(extractAllIds(ele, familyMembersFn));
			});
		}
		// else it is a simple participant
		else
		{
			var id = participant["identifier"];

			// if the identifier field exists
			if (id != null)
			{
				ids.push(id);
			}
		}

		return ids;
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
