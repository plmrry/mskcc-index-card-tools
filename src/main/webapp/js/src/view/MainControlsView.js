var MainControlsView = Backbone.View.extend({
	render: function()
	{
		var self = this;

		var variables = {};

		// compile the template using underscore
		var template = _.template(
			$("#upload_controls_template").html(),
			variables);

		// load the compiled HTML into the Backbone "el"
		self.$el.html(template);

		self.format();
	},
	format: function()
	{
		var self = this;

		// trigger a custom 'fileselect' event when a file selected
		$(document).on('change', '.btn-file :file', function() {
			var input = $(this);

			var	numFiles = input.get(0).files ? input.get(0).files.length : 1;
			var	label = input.val().replace(/\\/g, '/').replace(/.*\//, '');

			input.trigger('fileselect', [numFiles, label]);
		});

		var sampleUploadButton = self.$el.find(".sample-upload-btn :file");

		sampleUploadButton.on('fileselect', function(event, numFiles, label) {
			self.$el.find(".selected-sample-file-info").text("(" + label + ")");
		});

		var dataUploadButton = self.$el.find(".data-upload-btn :file");

		dataUploadButton.on('fileselect', function(event, numFiles, label) {
			self.$el.find(".selected-data-file-info").text("(" + label + ")");
		});

		var submit = self.$el.find(".submit-button");

		submit.click(function() {
			var dataUploadForm = self.$el.find(".data-file-form");
			var sampleInput = self.$el.find(".sample-data");
			var matrixInput = self.$el.find(".matrix-data");

			if (!sampleInput.val() ||
			    sampleInput.val().length === 0 ||
				!matrixInput.val() ||
				matrixInput.val().length === 0)
			{
				// no file selected yet
				ViewUtil.displayErrorMessage(
					"Please make sure that both the data matrix file and " +
					"the sample list file are selected.");

				return;
			}

			DataUtil.postFile('upload/file/',
				new FormData(dataUploadForm[0]),
				// success callback
				function(response) {
					// TODO process the response: visualize!
					self.$el.find(".oncosign-view").html('<pre>' +
						JSON.stringify(response, null, 4) + '</pre>');
				},
				// error callback
		        function(err) {
			        ViewUtil.displayErrorMessage(
				        "Error processing the data files. " +
				        "Please make sure that your files are valid.");
		        }
			);

			// TODO display loader message before actually loading the data
			// it will be replaced by the corresponding view once data is fetched
		});
	}
});
