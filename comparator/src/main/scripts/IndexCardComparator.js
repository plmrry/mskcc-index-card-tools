var IndexCardComparator = function()
{
	/**
	 * Compares 2 IndexCards and generate an IndexCard with
	 * the comparison results.
	 *
	 * @param pcCards           array of IndexCards (from Pathway Commons)
	 * @param inferenceCards    array of IndexCards to add comparison result
	 * @return {Array} an array of IndexCard JSONs with valid model_relation field
	 */
	function compareCards(pcCards, inferenceCards)
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
