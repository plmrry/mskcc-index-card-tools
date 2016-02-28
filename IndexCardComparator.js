var _ = require('underscore');
var IndexCardUtils = require('./IndexCardUtils.js');

var IndexCardComparator = function()
{
	// match types
	var EXACT = "exact";
	var SUBSET = "subset";
	var SUPERSET = "superset";
	var INTERSECT = "intersects";
	var DISTINCT = "distinct";
	var POS_RANGE = 1;


    var CONFLICTING = "conflicting";
    var CORROBORATION = "corroboration";
    var EXTENSION = "extension";
    var SPECIFICATION = "specification";

	var _paIdMap = {};
	var _pbIdMap = {};
	var _allIdMap = {};

	var _stats = {
		conflictCount: 0,
		corroborationCount: 0,
		specificationCount: 0,
		extensionCount: 0
	};

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
		 * NOTE: Weak equality do not cover the strong equality conditions!
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
		 * NOTE: Weak equality do not cover the strong equality conditions!
		 *
		 * @param translocationA a translocation
		 * @param translocationB another translocation
		 * @returns {boolean}   true if translocations match the equality condition
		 */
		weakEquality: function(translocationA, translocationB)
		{
			// one of the "to" locations null, and "from" locations are equal
			var equalFrom = (translocationA.to == null || translocationB.to == null) &&
			                (translocationB.from != null && translocationA.from != null &&
			                translocationB.from.toLowerCase() == translocationA.from.toLowerCase());

			// one of the "from" locations is null, and "to" locations are equal
            var equalTo = (translocationA.from == null || translocationB.from == null) &&
                          (translocationB.to != null && translocationA.to != null &&
                          translocationB.to.toLowerCase() == translocationA.to.toLowerCase());

			return equalFrom || equalTo;
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

			if (translocationA.from != null && translocationB.from == null)
			{
				// translocation A has a to_location but B does not have
				diff = true;
			}
			else if (translocationA.to != null && translocationB.to == null)
			{
				// translocation A has a to_location but B does not have
				diff = true;
			}
			else if (translocationA.from != null &&
			         translocationB.from != null &&
			         translocationA.from.toLowerCase() != translocationB.from.toLowerCase())
			{
				diff = true;
			}
			else if (translocationA.to != null &&
			         translocationB.to != null &&
			         translocationA.to.toLowerCase() != translocationB.to.toLowerCase())
			{
				// both translocations are valid and different
				diff = true;
			}

			return diff;
		}
	};

	var _participantId = {
		strongEquality: function(idA, idB)
		{
			return (idA.toLowerCase() == idB.toLowerCase());
		},
		weakEquality: function(idA, idB)
		{
			return (idA.toLowerCase() == idB.toLowerCase());
		},
		weakDiff: function(idA, idB)
		{
			return (idA.toLowerCase() != idB.toLowerCase());
		}
	};

	/**
	 * Loads the model cards into memory.
	 *
	 * @param modelCards    array of IndexCards
	 */
	function loadModel(modelCards)
	{
		// process pc cards to generate maps
		_.each(modelCards, function(modelCard, idx) {
			updateIdMap(_paIdMap, IndexCardUtils.participantA(modelCard), modelCard);
			updateIdMap(_pbIdMap, IndexCardUtils.participantB(modelCard), modelCard);
			updateIdMap(_allIdMap, IndexCardUtils.participantA(modelCard), modelCard);
			updateIdMap(_allIdMap, IndexCardUtils.participantB(modelCard), modelCard);
		});
	}

	/**
	 * Compares given IndexCard(s) and generates an array of IndexCards with
	 * the comparison results.
	 *
	 * @param inferenceCards    IndexCard(s) to add comparison result (may be an array or a single JSON)
	 * @return {Array} an array of IndexCard JSONs with valid model_relation field
	 */
	function compareCards(inferenceCards)
	{
		var updatedCards = [];

		if (!_.isArray(inferenceCards))
		{
			inferenceCards = [inferenceCards];
		}

		// for each inference card find matching PC card(s)
		_.each(inferenceCards, function(inferenceCard, idx) {
			var queryIds;
			var matchingCards;

			// "binds" should be handled separately
			if (IndexCardUtils.hasBind(inferenceCard))
			{
				// find matching cards for both participants
				queryIds = _.uniq(IndexCardUtils.extractAllIds(IndexCardUtils.participantA(inferenceCard)).concat(
					IndexCardUtils.extractAllIds(IndexCardUtils.participantB(inferenceCard))));

				matchingCards = findMatchingCards(queryIds, inferenceCard, _allIdMap, matchFilter);
			}
			// all other interactions
			else
			{
				// find matching cards for the participant b
				queryIds = getPbQueryIds(inferenceCard);
				matchingCards = findMatchingCards(queryIds, inferenceCard, _pbIdMap, matchFilter);
			}

			var updatedCard = findModelRelation(inferenceCard, matchingCards);

            classify(updatedCard);
			updatedCards.push(updatedCard);
			updateStats(updatedCard);
		});

		return updatedCards;
	}

    function classify(updatedCard) {
        updatedCard.score = 0;
        updatedCard.model_relation = EXTENSION; //Assume no good match by default
        _.each(updatedCard.match, function (match) {
	        match.score = 0;

	        // if not binds
            if (IndexCardUtils.interactionType(updatedCard).toLowerCase().indexOf("binds") == -1)
            {
	            //Exact matches
	            switch (match.deltaFeature)
	            {
		            case EXACT:
		            {
			            considerAForBase(match, updatedCard, 10, corr_conf);
			            break;
		            }
		            case SUBSET:
		            {
			            considerAForBase(match, updatedCard, 6, corr_conf);
			            break;
		            }
		            case SUPERSET:
		            {
			            considerAForBase(match, updatedCard, 6, spec_conf);
			            break;
		            }

		            //We will assume intersection and distinct to be extensions
	            }
            }
            // binds
	        else
            {
	            switch (match.deltaFeature)
	            {
		            case EXACT:
		            {
			            update(CORROBORATION, 10, updatedCard, match);
			            break;
		            }
		            //case SUBSET:
		            //{
			         //   update(CORROBORATION, 5, updatedCard, match);
			         //   break;
		            //}
		            //case SUPERSET:
		            //{
			         //   update(SPECIFICATION, 5, updatedCard, match);
			         //   break;
		            //}
	            }
            }
        });

	    return updatedCard;
    }

	function updateStats(indexCard)
	{
		// basic stats: model relation frequency
		switch (indexCard.model_relation)
		{
			case CORROBORATION: {
				_stats.corroborationCount++;
				break;
			}
			case CONFLICTING: {
				_stats.conflictCount++;
				break;
			}
			case SPECIFICATION: {
				_stats.specificationCount++;
				break;
			}
			case EXTENSION: {
				_stats.extensionCount++;
				break;
			}
		}

		// advanced stats: in addition to model relation, score and delta feature
		// classification (for the best match) are also taken into account
		var key = indexCard.model_relation + "_" + indexCard.score;

		if (indexCard.best_match != null)
		{
			key += "_" + indexCard.best_match.deltaFeature;
		}

		if (_stats[key] == null)
		{
			_stats[key] = 0;
		}

		_stats[key]++;
	}

    function corr_conf(match, base, updatedCard) {
        if (!match.potentialConflict) {
            update(CORROBORATION, base, updatedCard, match);
        }
        else {
            update(CONFLICTING, base - 1, updatedCard, match);   //We will assume this to be better than all inexact
            // matches although conflicting.
        }
    }

    function spec_conf(match, base, updatedCard) {
        if (!match.potentialConflict) {
            update(SPECIFICATION, base, updatedCard, match);
        }
        else {
            update(CONFLICTING, base - 1, updatedCard, match);   //We will assume this to be better than all inexact
            // matches although conflicting.
        }
    }

    function considerAForBase(match, updatedCard, base, typefunc) {
        switch (match.participantA) {
            case EXACT:
            {
                typefunc(match, base, updatedCard);
	            break;
            }
            case SUBSET:
            {
                typefunc(match, base / 2, updatedCard);
	            break;
            }
            case SUPERSET:
            {
                spec_conf(match, base / 2, updatedCard);
	            break;
            }
            case INTERSECT:
            {
                spec_conf(match, base / 3, updatedCard);
	            break;
            }
        }
    }

    function update(relation, classscore, updatedCard, match) {
        match.score = classscore;

	    if (updatedCard.score < classscore) {
            updatedCard.model_relation = relation;
            updatedCard.score = classscore;
            updatedCard.model_element = match.model_element;
	        updatedCard.best_match = match;
        }
    }

	/**
	 * Retrieves ids related to participant B for the given index card.
	 *
	 * @param indexCard an index card
	 * @returns {Array} ids in an array
	 */
	function getPbQueryIds(indexCard)
	{
		var familyMembersFn = null; // TODO define a proper family member retrieval function
		var queryIds = IndexCardUtils.extractAllIds(IndexCardUtils.participantB(indexCard), familyMembersFn);

		// the code below ignores complexes and protein families for participant B
		//var queryIds = [];
		//
		//var pbId = IndexCardUtils.participantB(indexCard)["identifier"];
		//
		//if (pbId != null)
		//{
		//	queryIds.push(pbId);
		//}

		return queryIds;
	}

	/**
	 *
	 * @param inferenceCard
	 * @param modelCard
	 * @returns {boolean}
	 */
	function matchFilter(inferenceCard, modelCard)
	{
		return (
			// TODO looking for exact participant_b id matching for now
			IndexCardUtils.hasBind(inferenceCard) && IndexCardUtils.hasBind(modelCard) ||
			//(strictPbMatch(inferenceCard, modelCard) &&
			(exactPbMatch(inferenceCard, modelCard) &&
			// interaction types should be compatible
			((IndexCardUtils.hasModification(inferenceCard) && IndexCardUtils.hasModification(modelCard)) ||
			 (IndexCardUtils.hasIncreaseDecrease(inferenceCard) && IndexCardUtils.hasIncreaseDecrease(modelCard)) ||
			 (IndexCardUtils.hasActivity(inferenceCard) && IndexCardUtils.hasActivity(modelCard)) ||
			 (IndexCardUtils.hasTranslocation(inferenceCard) && IndexCardUtils.hasTranslocation(modelCard))))
		);
	}

	/**
	 * Checks for strict matching participantBs in given index cards.
	 * This match ignores complexes and family members.
	 *
	 * @param inferenceCard
	 * @param modelCard
	 * @returns {boolean} true if strict match, false otherwise
	 */
	function strictPbMatch(inferenceCard, modelCard)
	{
		return IndexCardUtils.participantB(inferenceCard)["identifier"] != null &&
		       (IndexCardUtils.participantB(modelCard)["identifier"] === IndexCardUtils.participantB(inferenceCard)["identifier"]);
	}

	/**
	 * Checks for exact matching participantBs in given index cards.
	 * This match includes complexes and family members.
	 *
	 * @param inferenceCard
	 * @param modelCard
	 * @returns {boolean} true if exact match, false otherwise
	 */
	function exactPbMatch(inferenceCard, modelCard)
	{
		var inferenceCardPbIds = IndexCardUtils.extractAllIds(IndexCardUtils.participantB(inferenceCard));
		var modelCardPbIds = IndexCardUtils.extractAllIds(IndexCardUtils.participantB(modelCard));

		var result = compare(inferenceCardPbIds,
		                     modelCardPbIds,
		                     _participantId.strongEquality,
		                     _participantId.weakEquality,
		                     _participantId.weakDiff);

		return (result == EXACT);
	}

	/**
	 * Finds the model relation between the given index card and all matching cards
	 * by comparing certain features of the cards.
	 *
	 * @param indexCard
	 * @param matchingCards
	 * @returns the original index card with updated information
	 */
	function findModelRelation(indexCard, matchingCards)
	{
		// TODO we may want to create a mapping instead of adding new fields into the
		// index card object in order to avoid modifying the original index card

		// create a match field if there are matching cards
		if (matchingCards.length > 0)
		{
			indexCard["match"] = [];
		}

		// determine model relation wrt interaction type

		if (IndexCardUtils.hasModification(indexCard))
		{
			compareModification(indexCard, matchingCards)
		}
		else if (IndexCardUtils.hasTranslocation(indexCard))
		{
			compareTranslocation(indexCard, matchingCards);
		}
		else if (IndexCardUtils.hasBind(indexCard))
		{
			compareBind(indexCard, matchingCards);
		}
		else if (IndexCardUtils.hasIncreaseDecrease(indexCard))
		{
			compareInteractionType(indexCard, matchingCards);
		}
		else if (IndexCardUtils.hasActivity(indexCard))
		{
			compareInteractionType(indexCard, matchingCards);
		}

		// add additional participant info for match result

		if (indexCard["match"])
		{
			// remove the redundant "match" field if no match at all
			if (indexCard["match"].length == 0)
			{
				delete indexCard["match"];
			}
			// we have matching participant B(s), now compare participant A(s)
			else if (!IndexCardUtils.hasBind(indexCard))
			{
				compareParticipantA(indexCard, matchingCards);
			}
		}

		return indexCard;
	}

	function compareInteractionType(indexCard, matchingCards)
	{
		_.each(matchingCards, function(card, idx) {
			var result = DISTINCT;
			var conflict = false;

			if (IndexCardUtils.interactionType(indexCard).toLocaleLowerCase() == IndexCardUtils.interactionType(card).toLowerCase())
			{
				result = EXACT;
			}

			if (result == DISTINCT &&
			    isOppositeInteractions(indexCard, card) &&
			    IndexCardUtils.hasValidParticipantA(indexCard))
			{
				conflict = true;
			}

			indexCard["match"].push({deltaFeature: result, potentialConflict: conflict, card: card});
		});
	}

	function compareParticipantA(indexCard, matchingCards)
	{
		// when the index card has no valid participant A,
		// then comparison should not be distinct
		if (!IndexCardUtils.hasValidParticipantA(indexCard))
		{
			_.each(indexCard["match"], function(ele, idx){
				if (!IndexCardUtils.hasValidParticipantA(ele.card))
				{
					ele.participantA = EXACT;
				}
				else
				{
					ele.participantA = SUBSET;
				}
			});
		}
		else
		{
			var indexCardPaIds = IndexCardUtils.extractAllIds(
				IndexCardUtils.participantA(indexCard));

			_.each(indexCard["match"], function(ele, idx){
				var matchedCardPaIds = IndexCardUtils.extractAllIds(
					IndexCardUtils.participantA(ele.card));

				var result = compare(indexCardPaIds,
				                     matchedCardPaIds,
				                     _participantId.strongEquality,
				                     _participantId.weakEquality,
				                     _participantId.weakDiff);

				ele.participantA = result;
			});
		}
	}

	function compareBind(indexCard, matchingCards)
	{
		var indexCardIds = _.uniq(IndexCardUtils.extractAllIds(IndexCardUtils.participantA(indexCard)).concat(
			IndexCardUtils.extractAllIds(IndexCardUtils.participantB(indexCard))));

		_.each(matchingCards, function(card, idx){
			if (IndexCardUtils.hasBind(card))
			{
				var matchedCardIds = _.uniq(IndexCardUtils.extractAllIds(IndexCardUtils.participantA(card)).concat(
					IndexCardUtils.extractAllIds(IndexCardUtils.participantB(card))));

				var result = compare(indexCardIds,
				                     matchedCardIds,
				                     _participantId.strongEquality,
				                     _participantId.weakEquality,
				                     _participantId.weakDiff);

				indexCard["match"].push({deltaFeature: result, potentialConflict: false, card: card});
			}
		});
	}

	/**
	 * Checks if the interaction type of the index card is opposing to
	 * the interaction of matched card.
	 *
	 * Opposing interactions:
	 *      adds_modification X removes_modification
	 *      increases X decreases
	 *      increases_activity X decreases_activity
	 *
	 * @param indexCard
	 * @param matchingCard
	 */
	function isOppositeInteractions(indexCard, matchingCard)
	{
		var interaction = IndexCardUtils.interactionType(indexCard).toLowerCase();
		var matchingInteraction = IndexCardUtils.interactionType(matchingCard).toLowerCase();

		return (interaction == "adds_modification" && matchingInteraction == "removes_modification") ||
			(interaction == "removes_modification" && matchingInteraction == "adds_modification") ||
			(interaction == "increases" && matchingInteraction == "decreases") ||
			(interaction == "decreases" && matchingInteraction == "increases") ||
			(interaction == "increases_activity" && matchingInteraction == "decreases_activity") ||
			(interaction == "decreases_activity" && matchingInteraction == "increases_activity");
	}

	function compareModification(indexCard, matchingCards)
	{
		var modifications = IndexCardUtils.getModifications(indexCard);

		// determine the model relation by comparing modifications

		// for each matching card compare modifications with the modifications of
		// the inference card and update the match field
		_.each(matchingCards, function(card, idx) {
			if (IndexCardUtils.hasModification(card))
			{
				var result = compare(modifications,
				                     IndexCardUtils.getModifications(card),
				                     _modification.strongEquality,
				                     _modification.weakEquality,
				                     _modification.weakDiff);

				var conflict = false;

				if (result != DISTINCT &&
				    isOppositeInteractions(indexCard, card) &&
				    IndexCardUtils.hasValidParticipantA(indexCard))
				{
					conflict = true;
				}

				indexCard["match"].push({deltaFeature: result, potentialConflict: conflict, card: card});
			}
		});
	}

	function compareTranslocation(indexCard, matchingCards)
	{
		var translocation = IndexCardUtils.getTranslocation(indexCard);

		// for each matching card compare modifications with the modifications of
		// the inference card and update the match field
		_.each(matchingCards, function(card, idx) {
			if (IndexCardUtils.hasTranslocation(card))
			{
				var result = compare([translocation],
				                     [IndexCardUtils.getTranslocation(card)],
				                     _translocation.strongEquality,
				                     _translocation.weakEquality,
				                     _translocation.weakDiff);

				// in case of DISTINCT result, check if there is a potential conflict
				var conflict = false;

				if (result == DISTINCT &&
				    IndexCardUtils.hasValidParticipantA(indexCard))
				{
					conflict = translocation.to &&
					           translocation.from &&
					           IndexCardUtils.getTranslocation(indexCard).from &&
					           IndexCardUtils.getTranslocation(indexCard).to &&
					           (translocation.to.toLowerCase() == IndexCardUtils.getTranslocation(indexCard).from.toLowerCase() &&
					            translocation.from.toLowerCase() == IndexCardUtils.getTranslocation(indexCard).to.toLowerCase());
				}

				indexCard["match"].push({deltaFeature: result, potentialConflict: conflict, card: card});
			}
		});
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
		var equalFrom = (translocationA.from == null && translocationB.from == null) ||
				(translocationA.from != null && translocationB.from != null &&
				translocationA.from.toLowerCase() == translocationB.from.toLowerCase());

		var equalTo = (translocationA.to == null && translocationB.to == null) ||
			(translocationA.to != null && translocationB.to != null &&
			translocationA.to.toLowerCase() == translocationB.to.toLowerCase());

		return equalTo && equalFrom;
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
		// if no weak eq function is provided, use strong eq functions
		weakEqualityFn = weakEqualityFn || strongEqualityFn;

		var strongIntersection = IndexCardUtils.intersect(inferenceSet, modelSet, strongEqualityFn);
		var weakIntersection = IndexCardUtils.intersect(inferenceSet, modelSet, weakEqualityFn);
		// difference of inference set from model set
		var inferenceDiffModel = difference(inferenceSet, modelSet, diffFn);
		// difference of model set from inference set
		var modelDiffInference = difference(modelSet, inferenceSet, diffFn);

		// weak intersection may not cover the strong intersection depending
		// on the weak & strong equality functions, so making sure both
		// intersection sets are empty
		if (strongIntersection.length === 0 &&
		    weakIntersection.length === 0)
		{
			//// both empty sets!
			//if (inferenceSet.length === 0 && modelSet.length === 0)
			//{
			//	return EXACT;
			//}
			//// inference set is empty, so it is a subset of model set
			//else if (inferenceSet.length === 0 && modelSet.length > 0)
			//{
			//	return SUBSET;
			//}
			//// model set set is empty, so inference set is a superset of model set
			//else if (inferenceSet.length === 0 && modelSet.length > 0)
			//{
			//	return SUPERSET;
			//}

			// distinct: no matching element
			return DISTINCT;
		}

		if (inferenceSet.length === modelSet.length)
		{
			// exact match: all sets have equal number of elements and
			// all elements are the same...
			if (inferenceSet.length === strongIntersection.length)
			{
				return EXACT;
			}
			// no weak difference, inference set is a subset
			else if (inferenceDiffModel.length === 0)
			{
				return SUBSET;
			}
			else if (modelDiffInference.length === 0)
			{
				return SUPERSET;
			}
		}

		// inference is subset of model (no weak difference)
		if (inferenceSet.length < modelSet.length &&
		    inferenceDiffModel.length === 0)
		{
			return SUBSET;
		}

		// inference is super set of model (no weak difference)
		if (inferenceSet.length > modelSet.length &&
		    modelDiffInference.length === 0)
		{
			return SUPERSET;
		}

		// the intersection set is not empty, and no other conditions hold
		return INTERSECT;
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
				if (matchFilterFn(inferenceCard, card))
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
		var ids = IndexCardUtils.extractAllIds(participant);

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

	function getStats()
	{
		return _.extend({}, _stats);
	}

	// public functions
	this.compareCards = compareCards;
	this.loadModel = loadModel;
	this.getStats = getStats;
	// Added by Paul Murray 7/9/15
	this.matchFilter = matchFilter;
	this.findModelRelation = findModelRelation;
	this.classify = classify;
};

module.exports = IndexCardComparator;
