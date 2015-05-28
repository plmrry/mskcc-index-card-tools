var IndexCardComparator = function()
{
	/**
	 * Compares 2 IndexCards and generate an IndexCard with
	 * the comparison results.
	 *
	 * @param pcCards       List of IndexCard JSONs (from Pathway Commons)
	 * @param inferenceCard IndexCard to add comparison result
	 * @return {Object} an IndexCard as a JSON with a valid model_relation field
	 */
	function compareCards(pcCards, inferenceCard)
	{
		// TODO compare 'em all!
	}

	/**
	 *
	 * @param pcCard
	 * @param inferenceCard
	 */
	function isMatch(pcCard, inferenceCard)
	{

	}

	// public functions
	this.compareCards = compareCards;
};

module.exports = IndexCardComparator;
