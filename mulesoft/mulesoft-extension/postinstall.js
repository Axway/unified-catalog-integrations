const chalk = require('chalk');
const path = require('path');

// this makes sure it doesn't run on a dev npm install
if (process.env.NODE_ENV === 'production') {
	process.exit(0);
}

const banner = (titleColor, textColor, status, header, example) => {
	const width = process.stdout.columns,
		border = '='.repeat(width),
		title = `[${status.toUpperCase()}]:\n`;

	header = header || '';
	console.log(chalk[titleColor](`\n${border}`));
	console.log(chalk[titleColor].bold(title));
	console.log(chalk[textColor](header));
	console.log(chalk['yellow'](example));
	console.log(chalk[titleColor](`${border}\n`));
};

const info = (header, example) => {
	banner('green', 'white', 'info', header, example);
};
info(
	'Extension Installed: You may now add it to the Central CLI\n',
	`$ amplify central config set extensions.mulesoft-extension ${process.cwd()}${path.sep}node_modules${path.sep}@axway${path.sep}amplify-central-mulesoft-extension`
);
