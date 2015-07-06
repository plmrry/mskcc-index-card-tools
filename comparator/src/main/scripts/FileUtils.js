var fs = require('fs');
var _ = require('underscore');

var FileUtils = (function()
{
	/**
	 * Recursive traversal of the target directory.
	 * see http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
	 *
	 * @param dir   target dir
	 * @param done  callback function
	 */
	function walk(dir, done) {
		var results = [];
		fs.readdir(dir, function(err, list) {
			if (err) return done(err);
			var pending = list.length;
			if (!pending) return done(null, results);
			list.forEach(function(file) {
				file = dir + '/' + file;
				fs.stat(file, function(err, stat) {
					if (stat && stat.isDirectory()) {
						walk(file, function(err, res) {
							results = results.concat(res);
							if (!--pending) done(null, results);
						});
					} else {
						results.push(file);
						if (!--pending) done(null, results);
					}
				});
			});
		});
	}

	function filterJson(files)
	{
		var jsons = [];

		_.each(files, function(filename, idx) {
			if (filename.toLowerCase().indexOf(".json") != -1 &&
			    filename.toLowerCase().indexOf("_mskcc") == -1)
			{
				jsons.push(filename)
			}
		});

		return jsons;
	}

	function filterCustom(files, filterFn)
	{
		var filtered = [];

		_.each(files, function(filename, idx) {
			if (filterFn(filename, idx))
			{
				filtered.push(filename);
			}
		});

		return filtered;
	}

	return {
		filterJson: filterJson,
		filterCustom: filterCustom,
		walkDir : walk
	}
})();

module.exports = FileUtils;

