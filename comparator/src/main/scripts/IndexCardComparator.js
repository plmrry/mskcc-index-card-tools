var _ = require('underscore');

var IndexCardComparator = function()
{
	// match types
	var EXACT = "exact";
	var SUBSET = "subset";
	var SUPERSET = "superset";
	var INTERSECT = "intersects";
	var DISTINCT = "distinct";
	var POS_RANGE = 1;

	var _paIdMap = {};
	var _pbIdMap = {};

	// helper functions related to interaction types: modification
	var _modification = {
		/**
		 * Checks if modification A is equal to modification B.
		 * The equality condition:
		 *    - positions must be equal (see isEqualPosition function)
		 *    - modification types must be equal
		 *
		 * @param modificationA a modification
		 * @param modificationB another modification
		 * @returns {boolean}   true if modifications match the equality condition
		 */
		strongEquality: function (modificationA, modificationB)
		{
			return isEqualPosition(modificationA, modificationB) &&
			       modificationA["modification_type"].toLowerCase() == modificationB["modification_type"].toLowerCase();
		},
		/**
		 * Checks if modification A is equal to modification B.
		 * The equality condition:
		 *    - at least one position must be null
		 *    - modification types must be equal
		 *
		 * @param modificationA a modification
		 * @param modificationB another modification
		 * @returns {boolean}   true if modifications match the equality condition
		 */
		weakEquality: function(modificationA, modificationB)
		{
			return modificationA["modification_type"].toLowerCase() == modificationB["modification_type"].toLowerCase() &&
			       (modificationA["position"] == null || modificationB["position"] == null);
		},
		/**
		 * Checks if modification A is different from modification B.
		 * The difference condition:
		 *    - modification types are different OR
		 *    - modification A has a position but B does not have OR
		 *    - both positions are valid and not equal
		 *
		 * @param modificationA a modification
		 * @param modificationB another modification
		 * @returns {boolean}   true if modifications match the difference condition
		 */
		weakDiff: function(modificationA, modificationB)
		{
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
			         !isEqualPosition(modificationA, modificationB))
			{
				// both not null and different
				diff = true;
			}

			return diff;
		}
	};

	// helper functions related to interaction types: translocation
	var _translocation = {
		/**
		 * Checks if translocation A is equal to translocation B.
		 * The equality condition:
		 *    - locations must be equal (see isEqualTranslocation function)
		 *
		 * @param translocationA a translocation
		 * @param translocationB another translocation
		 * @returns {boolean}   true if translocations match the equality condition
		 */
		strongEquality: function (translocationA, translocationB)
		{
			return isEqualTranslocation(translocationA, translocationB);
		},
		/**
		 * Checks if translocation A is equal to translocation B.
		 * The equality condition:
		 *    - at least one to_location must be null
		 *
		 * @param translocationA a translocation
		 * @param translocationB another translocation
		 * @returns {boolean}   true if translocations match the equality condition
		 */
		weakEquality: function(translocationA, translocationB)
		{
			return translocationA.from.toLowerCase() == translocationB.from.toLowerCase() &&
			       (translocationA.to == null || translocationB.to == null);
		},
		/**
		 * Checks if translocation A is different from translocation B.
		 * The difference condition:
		 *    - from_locations are different
		 *    - translocation A has a to_location but B does not have
		 *    - both to_locations are valid and translocations are not equal
		 *
		 * @param translocationA a translocation
		 * @param translocationB another translocation
		 * @returns {boolean}   true if translocations match the difference condition
		 */
		weakDiff: function(translocationA, translocationB)
		{
			var diff = false;

			if (translocationA.from.toLowerCase() != translocationB.from.toLowerCase())
			{
				diff = true;
			}
			else if (translocationA.to != null && translocationB.to == null)
			{
				// translocation A has a to_location but B does not have
				diff = true;
			}
			else if (translocationA.to != null && translocationB.to != null &&
				!isEqualTranslocation(translocationA, translocationB))
			{
				// both translocations are valid and different
				diff = true;
			}

			return diff;
		}
	};

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

			// TODO find best match within the match array (and update model relation field?)
			updatedCards.push(updatedCard);
		});

		// TODO debug, remove when done
		console.log(JSON.stringify(updatedCards));

		return updatedCards;
	}

	/**
	 * Retrieves ids related to participant B for the given index card.
	 *
	 * @param indexCard an index card
	 * @returns {Array} ids in an array
	 */
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

	/**
	 * Checks for exact matching participantBs in given index cards.
	 *
	 * @param inferenceCard
	 * @param modelCard
	 * @returns {boolean} true if exact match, false otherwise
	 */
	function strictPbMatch(inferenceCard, modelCard)
	{
		return participantB(inferenceCard)["identifier"] != null &&
		       (participantB(modelCard)["identifier"] === participantB(inferenceCard)["identifier"]);
	}

	function findModelRelation(indexCard, matchingCards)
	{
		// create a match field if there are matching cards
		if (matchingCards.length > 0)
		{
			indexCard["match"] = [];
		}

		// TODO determine model relation wrt interaction type

		if (hasModification(indexCard))
		{
			var modifications = getModifications(indexCard);

			// determine the model relation by comparing modifications

			// for each matching card compare modifications with the modifications of
			// the inference card and update the match field
			_.each(matchingCards, function(card, idx) {
				if (hasModification(card))
				{
					var result = compare(modifications,
					                     getModifications(card),
					                     _modification.strongEquality,
					                     _modification.weakEquality,
					                     _modification.weakDiff);

					indexCard["match"].push({type: result, card: card});
				}
			});
		}
		else if (hasTranslocation(indexCard))
		{
			var translocation = getTranslocation(indexCard);

			// for each matching card compare modifications with the modifications of
			// the inference card and update the match field
			_.each(matchingCards, function(card, idx) {
				if (hasTranslocation(card))
				{
					var result = compare([translocation],
					                     [getTranslocation(indexCard)],
					                     _translocation.strongEquality,
					                     _translocation.weakEquality,
					                     _translocation.weakDiff);

					indexCard["match"].push({type: result, card: card});
				}
			});
		}

		// remove the redundant "match" field if no match at all
		if (indexCard["match"] && indexCard["match"].length == 0)
		{
			delete indexCard["match"];
		}

		return indexCard;
	}

	/**
	 * Checks the equality of positions for 2 modifications.
	 *
	 * @param modificationA a modification
	 * @param modificationB another modification
	 * @returns {boolean} true if equal, false otherwise
	 */
	function isEqualPosition(modificationA, modificationB)
	{
		var posA = parseInt(modificationA["position"]);
		var posB = parseInt(modificationB["position"]);

		// pos A or pos B is not a number!
		if (_.isNaN(posA) || _.isNaN(posB))
		{
			// use regular string equality
			return (modificationA["position"] == modificationB["position"]);
		}
		else
		{
			// if the difference between 2 positions is within the range,
			// then those positions are considered equal
			return (Math.abs(posA - posB) <= POS_RANGE);
		}
	}

	function isEqualTranslocation(translocationA, translocationB)
	{
		return translocationA.from.toLowerCase() == translocationB.from.toLowerCase() &&
		       translocationA.to.toLowerCase() == translocationB.to.toLowerCase();
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

	/**
	 * Finds the difference between two sets wrt to
	 * the given difference criteria as a function
	 *
	 * @param setA      a set
	 * @param setB      another set
	 * @param diffFn    difference function
	 * @returns {Array} returns the difference set as an array
	 */
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

	function hasTranslocation(indexCard)
	{
		return interactionType(indexCard).toLowerCase() == "translocation" &&
		       (indexCard["extracted_information"]["from_location"] != null ||
		       indexCard["extracted_information"]["to_location"] != null)
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

	function getTranslocation(indexCard)
	{
		return {
			from: indexCard["extracted_information"]["from_location"],
			to: indexCard["extracted_information"]["to_location"]
		};
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

	/**
	 * Extracts recursively all possible ids from the given participant.
	 *
	 * @param participant     a participant (simple, complex or family member)
	 * @param familyMembersFn optional function to retrieve the family members
	 * @returns {Array}       extracted ids as an array
	 */
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
