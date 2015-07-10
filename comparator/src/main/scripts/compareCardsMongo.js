var mongo = require('mongodb');
var monk = require('monk');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var _ = require('underscore');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardUtils = require('./IndexCardUtils.js');

var comparator = new IndexCardComparator();

var db_name = "index_cards_v2";
var db = monk("127.0.0.1:27017/" + db_name);

var fries_cards = db.get("fries_cards");
var pc_cards = db.get("pc_cards");
var matches_collection = db.get("card_matches");

/**
* Based on compareCards in IndexCardComparator.js
*/

var i = 0;

var MAX_MATCHES = 20e4;

var go = function() {
	// var query = { _filename: "PMC2075366-card-evem-PMC2075366-UAZ-r1-32-0-121" }
	// PMC3725175-card-evem-PMC3725175-UAZ-r1-54-5-27_match.json
	// var query = { _filename: "PMC3725175-card-evem-PMC3725175-UAZ-r1-54-5-27" } // filesize: 1.17 GB matches: 6631
	// var query = { _filename: "PMC2789045-card-evem-PMC2789045-UAZ-r1-179-5-44" }
	// var query = { _filename: "PMC2118656-card-evem-PMC2118656-UAZ-r1-37-0-15" }
	// var query = { _filename: "PMC2845649-card-evem-PMC2845649-UAZ-r1-6-6-165" } // filesize: 2.5 MB matches: 1289

	var inference_cards = new Promise(function(resolve) {
		// fries_cards.findOne(query).then(resolve);
		fries_cards.find({}).then(resolve);
	});

	var matchFilter = comparator.matchFilter;

	inference_cards
		.each(function(inference_card) {
			var matches = new Promise(function(resolve) {
				var query = getMatchQuery(inference_card);
				pc_cards.find(query).then(resolve)
			});

			return matches
				.filter(function(match) {
					return matchFilter(inference_card, match);
				})
				.then(function(matching_cards) {
					console.log("Matching cards: ", matching_cards.length);
					if (matching_cards.length > MAX_MATCHES) return Promise.reject("Too many.");
					return matching_cards;
				})
				.then(function(matching_cards) {
					var updated_card = comparator.findModelRelation(inference_card, matching_cards);
					var classified_card = comparator.classify(updated_card);
					return classified_card;
				})
				.catch(function(e) {
					console.error(e);
				})
				.then(function(classified) {
					if (classified.match) {
						classified.match
							.forEach(function(match) {
								match._id = match.card._id;
								delete match.card;
							});
					}
					delete classified.evidence;
					delete classified.extracted_information;
					delete classified.pmc_id;
					delete classified.reader_type;
					delete classified.reading_started;
					delete classified.reading_complete;
					delete classified.fries_provenance;
					delete classified.submitter;
					return classified;
				})
				.then(function(pruned) {
					return matches_collection.insert(pruned).then(function(d) {
						console.log("inserted one. " + ++i);
					})
				})
		})
		.then(function() {
			console.log("Done.");
			process.exit(0);
		})
}
go()

function getMatchQuery(card) {
	var has_bind = IndexCardUtils.hasBind(card);

	if (has_bind) {
		var all_ids = card._participant_a_ids
			.concat(card._participant_b_ids)

		var query_ids = _.uniq(all_ids);
		var _part_a = { _participant_a_ids: { $in: query_ids }};
		var _part_b = { _participant_b_ids: { $in: query_ids }};

		var query = { $or: [ _part_a, _part_b ] };

		return query
	}
	else {
		var query_ids = card._participant_b_ids;
		var query = { _participant_b_ids: { $in: query_ids }};

		return query
	}
}
