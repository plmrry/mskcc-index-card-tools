var _ = require('underscore');

var IndexCardUtils = (function()
{
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

		// participant is null, return empty set...
		if (!participant)
		{
			return ids;
		}

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
			var id = normalizeId(participant["identifier"]);

			// if the identifier field exists
			if (id != null)
			{
				ids.push(id);
			}
		}

		return _.uniq(ids);
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

	function hasTranslocation(indexCard)
	{
		return interactionType(indexCard).toLowerCase() == "translocation" &&
		       (indexCard["extracted_information"]["from_location"] != null ||
		        indexCard["extracted_information"]["to_location"] != null ||
		        indexCard["from_location"] != null ||
		        indexCard["to_location"] != null);
	}

	function hasModification(indexCard)
	{
		return (getModifications(indexCard) != null) &&
		       (getModifications(indexCard).length > 0);
	}

	function hasIncreaseDecrease(indexCard)
	{
		return interactionType(indexCard).toLowerCase() == "decrease" ||
		       interactionType(indexCard).toLowerCase() == "increase";
	}

	function hasActivity(indexCard)
	{
		return interactionType(indexCard).toLowerCase().indexOf("activity") != -1;
	}

	function hasBind(indexCard)
	{
		return interactionType(indexCard).toLowerCase().indexOf("binds") != -1;
	}

	function getModifications(indexCard)
	{
		return indexCard["extracted_information"]["modifications"];
	}

	function getTranslocation(indexCard)
	{
		return {
			from: indexCard["extracted_information"]["from_location"] || indexCard["from_location"],
			to: indexCard["extracted_information"]["to_location"] || indexCard["to_location"]
		};
	}

	/**
	 * Normalizes the given id by removing any character before ":"
	 *
	 * @param id         original id
	 * @returns {string} normalized id
	 */
	function normalizeId(id)
	{
		if (!id)
		{
			return id;
		}

		var parts = id.toLowerCase().split(":");

		if (parts.length > 1)
		{
			return parts[1].trim();
		}
		else
		{
			return id.toLowerCase().trim();
		}
	}

	return {
		intersect: intersect,
		extractAllIds: extractAllIds,
		participantA: participantA,
		participantB: participantB,
		interactionType: interactionType,
		hasTranslocation: hasTranslocation,
		hasModification: hasModification,
		hasActivity: hasActivity,
		hasBind: hasBind,
		hasIncreaseDecrease: hasIncreaseDecrease,
		getModifications: getModifications,
		getTranslocation: getTranslocation,
		normalizeId : normalizeId
	};
})();

module.exports = IndexCardUtils;