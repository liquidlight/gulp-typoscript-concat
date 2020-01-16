/**
 * Typoscript Concat
 *
 * @author Mike Street
 * @copyright Liquid Light Group Ltd.
 * @url http://www.liquidlight.co.uk
 *
 * @use:
 * 	const typoscriptConcat = require('yposcript-concat');
 *
 * 	.pipe(typoscriptConcat({
 * 		basepath: 'html/',
 * 		debug: true
 * 	}))
 */
const through = require('through2');
const fs = require('fs');
const PluginError = require('plugin-error');
const merge = require('merge');
const p_magic = require('path');
const log = require('fancy-log');
const c = require('ansi-colors');
const lineNumber = require('line-number');

// File not found error
function fileNotFound(file, include, path) {
	let line = lineNumber(file.contents.toString(), new RegExp(include));

	// Output the error (looks like the gulp-sass one)
	// Indentation is odd due to `` working like "pre" tags
	log.error(`${c.red('[problem]')} ${file.path.replace(process.env.INIT_CWD, '')}
Error: File to import not found or unreadable: ${path}
	on line ${c.cyan(line[0].number)} of ${c.cyan(file.path.replace(process.env.INIT_CWD, ''))}
>> ${include}
	`);
}

module.exports = options => {
	// Baseline config,
	const base_config = {
		// Base path is the folder, relative to your gupfile, the site root
		// e.g where `typo3` and `typo3conf` folders are
		basepath: '',

		// debug outputs filenames in the compiled file
		debug: false
	};

	// Merge options with those passed in
	options = merge.recursive(true, base_config, options);

	// Work out site root & typo3 dirs - "process.env.INIT_CWD" is the directory
	// where the gulpfile.js is
	const basepath = process.env.INIT_CWD + '/' + (options.basepath.replace(/\/$/, ""));
		typo3_dir = basepath + '/typo3',
		typo3_conf = basepath + '/typo3conf',
		ext_locations = [
			typo3_conf + '/ext/',
			typo3_dir + '/ext/',
			typo3_dir + '/sysext/'
		];

	// Process each of the files passed in
	return through.obj((file, encoding, callback) => {

		// Ensure the file is not null & not a stream
		if (file.isNull()) {
			callback(null, file);
			return;
		}

		if (file.isStream()) {
			callback(new PluginError('gulp-typoscript', 'Streaming not supported'));
			return;
		}

		(async () => {
			try {
				// Get the file contents as a full string
				let final_file = file.contents.toString(),
					// Work out what folder the file is in
					folder = p_magic.dirname(file.path) + '/',
					// Find all the partials in the file
					partials = final_file.match(/\@imports (["'])((?:\\\1|(?:(?!\1)).)*)(\1)/g);

				// If there are no partials, then just return and arry on your day
				if(typeof partials == 'undefined' || !partials || !partials.length) {
					callback(null, file);
					return;
				}

				// Loop through each partials found
				for(partial of partials) {

					// Work out the file location and load the contents
					let path = (partial.match(/\@imports (["'])((?:\\\1|(?:(?!\1)).)*)(\1)/))[2];
						import_path = false,
						import_contents = '';

					// If the file path begins with EXT, then it will hopefully
					// adhere to the EXT: path stack
					if(path.startsWith('EXT:')) {
						path = path.replace('EXT:', '');

						for(ext of ext_locations) {
							if(fs.existsSync(ext + path)) {
								import_path = ext + path;
								continue;
							}
						}

						// If it begins with EXT, and we couldn't find it, log
						// the error
						if(!import_path) {
							fileNotFound(file, partial, path);
						}
					} else if(path.startsWith('/')) {
						// Is it an absolute path?
						import_path = path;
					} else {
						// If not, we assume it is relative
						import_path = folder + path;
					}

					// If we have a compiled import path, try and load the file
					if(import_path) {
						try {
							import_contents = fs.readFileSync(import_path, 'utf8');
						} catch (err) {
							if (err.code === 'ENOENT') {
								fileNotFound(file, partial, import_path);
							} else {
								throw err;
							}
						}
					}

					// If dev mode is enabled, the path will be put in the
					// compile file for debugging, even if it isn't found
					if(options.debug) {
						import_contents = `### ${partial} ### \n${import_contents}`;
					}

					// Put the new contents back in the file
					final_file = final_file.replace(partial, import_contents);
				}

				// Output the file
				file.contents = Buffer.from(final_file);
				setImmediate(callback, null, file);

			} catch (error) {
				const tsError = error.name === 'TyposcriptError';

				if (tsError) {
					error.message += error.showSourceCode();
				}

				// Prevent stream unhandled exception from being suppressed by Promise
				setImmediate(callback, new PluginError('gulp-typoscript', error, {
					fileName: file.path,
					showStack: !tsError
				}));
			}
		})();
	});
};