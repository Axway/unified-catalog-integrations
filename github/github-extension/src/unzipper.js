var AdmZip = require('adm-zip');
var request = require('request');

var downloadAndUnzip = function(url, filename) {
	/**
     * Download a file
     * 
     * @param url
     */
	var download = function(url) {
		return new Promise(function(resolve, reject) {
			request(
				{
					url: url,
					method: 'GET',
					encoding: null
				},
				function(err, response, body) {
					if (err) {
						return reject(err);
					}
					resolve(body);
				}
			);
		});
	};

	/**
     * Unzip a Buffer
     * 
     * @param buffer
     * @returns {Promise}
     */
	var unzip = function(buffer) {
		return new Promise(function(resolve, reject) {
			var resolved = false;

			var zip = new AdmZip(buffer);
			var zipEntries = zip.getEntries(); // an array of ZipEntry records

			//if no filename defined, return the first entry
			if (!filename) {
				if (zipEntries.length == 0) {
					reject(new Error('No file found in archive.'));
				}
				resolve(zipEntries[0].getData().toString('utf8'));
			}

			zipEntries.forEach(function(zipEntry) {
				if (zipEntry.entryName === filename) {
					resolved = true;
					resolve(zipEntry.getData().toString('utf8'));
				}
			});

			if (!resolved) {
				reject(new Error('No file found in archive: ' + fileName));
			}
		});
	};

	return download(url).then(unzip);
};

module.exports = {
	downloadAndUnzip
};
