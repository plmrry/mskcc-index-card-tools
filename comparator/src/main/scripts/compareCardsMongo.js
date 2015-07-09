var mongo = require('mongodb');
var monk = require('monk');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path")

var IndexCardComparator = require('./IndexCardComparator.js');

var db_name = "index_cards_v2";
var db = monk("127.0.0.1:27017/" + db_name);

var fries_cards_db = db.get("fries_cards");
var pc_cards_db = db.get("pc_cards");

var go = function() {
	fries_cards_db.find({ "_filename": "PMC2075366-card-evem-PMC2075366-UAZ-r1-32-0-121_mskcc" })
		.then(function() {
			console.log(arguments);
		})
}

go()

// /**
// * Compares given IndexCard(s) and generates an array of IndexCards with
// * the comparison results.
// *
// * @param inferenceCards    IndexCard(s) to add comparison result (may be an array or a single JSON)
// * @return {Array} an array of IndexCard JSONs with valid model_relation field
// */
// function compareCards(inferenceCards)
// {
// 	var updatedCards = [];
//
// 	if (!_.isArray(inferenceCards))
// 	{
// 		inferenceCards = [inferenceCards];
// 	}
//
// 	// for each inference card find matching PC card(s)
// 	_.each(inferenceCards, function(inferenceCard, idx) {
// 		var queryIds;
// 		var matchingCards;
//
// 		// "binds" should be handled separately
// 		if (IndexCardUtils.hasBind(inferenceCard))
// 		{
// 			// find matching cards for both participants
// 			queryIds = _.uniq(IndexCardUtils.extractAllIds(IndexCardUtils.participantA(inferenceCard)).concat(
// 				IndexCardUtils.extractAllIds(IndexCardUtils.participantB(inferenceCard))));
//
// 			matchingCards = findMatchingCards(queryIds, inferenceCard, _allIdMap, matchFilter);
// 		}
// 		// all other interactions
// 		else
// 		{
// 			// find matching cards for the participant b
// 			queryIds = getPbQueryIds(inferenceCard);
// 			matchingCards = findMatchingCards(queryIds, inferenceCard, _pbIdMap, matchFilter);
// 		}
//
// 		var updatedCard = findModelRelation(inferenceCard, matchingCards);
//
// 		classify(updatedCard);
// 		updatedCards.push(updatedCard);
// 		updateStats(updatedCard);
// 	});
//
// 	return updatedCards;
// }
