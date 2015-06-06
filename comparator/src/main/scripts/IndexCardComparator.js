var _ = require('underscore');

var IndexCardComparator = function()
{
	// match types
	var EXACT = "exact";
	var SUBSET = "subset";
	var SUPERSET = "superset";
	var INTERSECT = "intersects";
	var DISTINCT = "distinct";

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

		// for each inference card find matching PC card(s)
		_.each(inferenceCards, function(inferenceCard, idx) {
			// find matching cards for the participant b
			var queryIds = getPbQueryIds(inferenceCard);

			// TODO looking for strict id matching for now,
			// ignoring complexes and family numbers...
			var matchingCards = findMatchingCards(queryIds, inferenceCard, _pbIdMap, strictPbMatch);

			// TODO further filter matching cards wrt participant A

			var updatedCard = findModelRelation(inferenceCard, matchingCards);
			updatedCards.push(updatedCard);
		});

		return updatedCards;
	}

	function getPbQueryIds(indexCard)
	{
		// TODO currently we ignore complexes and protein families for participant B
		//var familyMembersFn = null; // TODO define a proper family member retrieval function
		//var queryIds = extractAllIds(participantB(indexCard), familyMembersFn);
		var queryIds = [];

		var pbId = participantB(indexCard)["identifier"];

		if (pbId != null)
		{
			queryIds.push(pbId);
		}

		return queryIds;
	}

	function strictPbMatch(inferenceCard, modelCard)
	{
		return participantB(inferenceCard)["identifier"] != null &&
		       (participantB(modelCard)["identifier"] === participantB(inferenceCard)["identifier"]);
	}

	function findModelRelation(indexCard, matchingCards)
	{
		// TODO determine model relation wrt interaction type

		if (hasModification(indexCard))
		{
			var modifications = getModifications(indexCard);

			// determine the model relation by comparing modifications

			// TODO add -/+1 for position equality...

			var strongEqualityFn = function(modificationA, modificationB) {
				return modificationA["position"] == modificationB["position"] &&
				       modificationA["modification_type"].toLowerCase() == modificationB["modification_type"].toLowerCase();
			};

			var weakEqualityFn = function(modificationA, modificationB) {
				return modificationA["modification_type"].toLowerCase() == modificationB["modification_type"].toLowerCase() &&
				       (modificationA["position"] == null || modificationB["position"] == null);
			};

			var weakDiffFn = function(modificationA, modificationB) {
				var diff = false;

				if (modificationA["modification_type"].toLowerCase() != modificationB["modification_type"].toLowerCase())
				{
					// modification type is different
					diff = true;
				}
				else if (modificationA["position"] != null && modificationB["position"] == null)
				{
					// modification A has a position but B does not have
					diff = true;
				}
				else if (modificationA["position"] != null &&
				         modificationB["position"] != null &&
				         modificationA["position"] != modificationB["position"])
				{
					// both not null and different
					diff = true;
				}

				return diff;
			};

			_.each(matchingCards, function(card, idx) {
				if (hasModification(card))
				{
					var result = compare(modifications,
					                     getModifications(card),
					                     strongEqualityFn,
					                     weakEqualityFn,
					                     weakDiffFn);

					// TODO return best matching card
					//indexCard["model_relation"] = result;
					console.log(result);
				}
			});
		}

		return indexCard;
	}

	/**
	 * Compares 2 sets wrt given equality and difference functions.
	 * Returns one of the predefined comparison results.
	 *
	 * @param inferenceSet
	 * @param modelSet
	 * @param strongEqualityFn
	 * @param weakEqualityFn
	 * @param diffFn
	 * @returns {string}
	 */
	function compare(inferenceSet, modelSet, strongEqualityFn, weakEqualityFn, diffFn)
	{
		//var sortFn = function(modificationA, modificationB) {
		//	return parseInt(modificationA["position"]) > modificationB(modificationB["position"]);
		//};

		//inferenceSet.sort(sortFn);
		//modelSet.sort(sortFn);

		// if no weak eq function is provided, use strong eq functions
		weakEqualityFn = weakEqualityFn || strongEqualityFn;

		var strongIntersection = intersect(inferenceSet, modelSet, strongEqualityFn);
		var weakIntersection = intersect(inferenceSet, modelSet, weakEqualityFn);
		// difference of inference set from model set
		var inferenceDiffModel = difference(inferenceSet, modelSet, diffFn);
		// difference of model set from inference set
		var modelDiffInference = difference(modelSet, inferenceSet, diffFn);

		// distinct: no matching element
		if (weakIntersection.length == 0)
		{
			return DISTINCT;
		}

		if (inferenceSet.length == modelSet.length)
		{
			// exact match: all sets have equal number of elements and
			// all elements are the same...
			if (inferenceSet.length == strongIntersection.length)
			{
				return EXACT;
			}
			// no weak difference, inference set is a subset
			else if (inferenceDiffModel.length == 0)
			{
				return SUBSET;
			}
			else if (modelDiffInference.length == 0)
			{
				return SUPERSET;
			}
		}

		if (inferenceSet.length < modelSet.length &&
		    inferenceDiffModel.length == 0)
		{
			return SUBSET;
		}

		if (inferenceSet.length > modelSet.length &&
		    modelDiffInference.length == 0)
		{
			return SUPERSET;
		}

		return INTERSECT;
	}

	function intersect(setA, setB, equalityFn)
	{
		equalityFn = equalityFn || function(a, b) {
			return a === b;
		};

		var intersection = [];

		for (var i=0; i < setA.length; i++)
		{
			for (var j=0; j < setB.length; j++)
			{
				if (equalityFn(setA[i], setB[j]))
				{
					intersection.push(setA[i]);
					break;
				}
			}
		}

		return intersection;
	}

	function difference(setA, setB, diffFn)
	{
		diffFn = diffFn || function(a, b) {
			return a !== b;
		};

		var difference = [];

		for (var i=0; i < setA.length; i++)
		{
			var diff = true;

			for (var j=0; j < setB.length; j++)
			{
				if (!diffFn(setA[i], setB[j]))
				{
					diff = false;
					break;
				}
			}

			if (diff)
			{
				difference.push(setA[i]);
			}
		}

		return difference;
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
	 * If no filter function provided, matches cards wrt interaction type only.
	 *
	 * @param queryIds
	 * @param inferenceCard
	 * @param idMap
	 * @param matchFilterFn additional filter function
	 */
	function findMatchingCards(queryIds, inferenceCard, idMap, matchFilterFn)
	{
		// set default filter function if not defined
		matchFilterFn = matchFilterFn || function(inferenceCard, modelCard) {
			return true;
		};

		var matchingCards = [];

		_.each(queryIds, function(id, idx) {
			_.each(idMap[id], function(card, idx) {
				if (interactionType(inferenceCard) === interactionType(card) &&
					matchFilterFn(inferenceCard, card))
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

	function interactionType(indexCard)
	{
		return indexCard["extracted_information"]["interaction_type"];
	}

	// public functions
	this.compareCards = compareCards;
};

module.exports = IndexCardComparator;
