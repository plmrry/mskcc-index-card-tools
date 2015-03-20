/**
 * Singleton class for data download and conversion tasks.
 */
var DataUtil = (function()
{
	/**
	 * Posts (uploads) file data thru ajax query.
	 *
	 * @param url       target (servlet) URL
	 * @param data      file (form) data
	 * @param success   callback to be invoked on success
	 * @param error     callback to be invoked on error
	 */
	function postFile(url, data, success, error)
	{
		$.ajax({
			url: url,
			type: 'POST',
			success: success,
			error: error,
			data: data,
			dataType: "json",
			//Options to tell jQuery not to process data or worry about content-type.
			cache: false,
			contentType: false,
			processData: false
		});
	}

	return {
		postFile: postFile
	};
})();