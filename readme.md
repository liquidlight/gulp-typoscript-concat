# Typoscript Concat

Allows concatenation of TypooScript files for TYPO3.

This allows you to develop with your `.ts` files in partials, but with a compiled, single file at the end.

## Installation

```bash
npm install --save-dev gulp-typoscript-concat
```

## Usage

#### Gulpfile

```js
const typoscriptConcat = require('gulp-typoscript-concat');

src('*.ts')
	.pipe(typoscriptConcat({
		basepath: '/',
		debug: true
	}))
	.pipe(dest(config.paths.dest));
```

#### TypoScript

```
@imports 'partials/navigation.ts'
@imports 'EXT:beuser/Configuration/TypoScript/setup.txt'
```

Using the `EXT:` prefix, will look in:

- `basepath/typo3conf/ext`
- `basepath/typo3/ext`
- `basepath/typo3/sysext`

### typoscriptConcat([options])

#### options

Type: `object`

##### options.basepath

Type: `string`<br>
Default: `''`

The path to your site root, relative to your `gulpfile.js`. Your site root is
where you `typo3` and `typo3conf` folders are located

##### options.debug

Type: `boolean`<br>
Default: `false`

With debug enabled, the paths will be inserted into the copiled file, allowing
you to see where each file starts