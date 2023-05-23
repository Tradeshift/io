const { Console } = require('console');
const chalk = require('chalk');
const httpServer = require('http-server');
const browserStackRunner = require('browserstack-runner');
const config = require('./browserstack.json');
const desktopBrowsers = require('./browserstack.desktop.json');
const mobileBrowsers = require('./browserstack.mobile.json');
const ports = require('./ports.json');

const logger = new Console(process.stdout, process.stderr);
const seed = String(Math.random()).slice(-5);

config.test_server_port = ports.base;

switch (process.argv[2]) {
	case '--desktop':
		logger.log('Running tests on desktop browsers.');
		config.browsers = desktopBrowsers;
		setSeed(logger);
		break;
	case '--mobile':
		logger.log('Running tests on mobile browsers.');
		config.browsers = mobileBrowsers;
		setSeed(logger);
		break;
	case '--local':
	default:
		logger.log('Running test server locally.');
		config.browsers = [];
		break;
}

httpServer
	.createServer({
		cache: -1
	})
	.listen(ports.crossdomain, '0.0.0.0', () => {
		logger.log(
			'Started HTTP Server for crossdomain simulation on port ' +
				ports.crossdomain +
				'.'
		);
		logger.log('Starting Browserstack HTTP Server on port ' + ports.base + '…');
		tsio(logger);
		browserStackRunner.run(config, async (err, report) => {
			if (err) {
				logger.log('BrowserStack Error:' + err);
				fail(logger);
				process.exit(2);
			}
			if (checkReport(report, logger)) {
				succ(logger);
				process.exit(0);
			} else {
				fail(logger);
				process.exit(1);
			}
		});
	});

function setSeed(logger) {
	config.test_path += '?seed=' + seed;
	logger.log('Seed set to ' + chalk.green.bold(seed));
}

/**
 * Check the report and pretty-print to the console
 * @see https://github.com/browserstack/browserstack-runner#usage-as-a-module
 * @param report BrowserStack report
 * @returns {boolean} true on success, false on failure
 */
function checkReport(report, logger) {
	const out = [];
	const errOut = [];

	if (!report.length) {
		logger.log(
			'No report received, probably because the build has been terminated...'
		);
		return false;
	}

	out.push('');
	out.push('');
	report.forEach(browserRes => {
		out.push('____________________________________________________________');
		out.push(
			chalk.white.bgBlack('Browser: ') +
				chalk.white.bold.bgBlack(browserRes.browser)
		);
		if (browserRes.tests && browserRes.tests.length) {
			browserRes.tests.forEach(test => {
				let timeString = ` (${test.runtime}ms)`;
				if (test.runtime >= 999) {
					timeString = chalk.red(timeString);
				} else if (test.runtime <= 333) {
					timeString = chalk.green(timeString);
				}

				if (test.status === 'failed') {
					out.push(chalk.red(`${test.suiteName} > ${test.name}`) + timeString);

					errOut.push('');
					errOut.push(`Browser: ${chalk.red.bold(browserRes.browser)}`);
					errOut.push(
						chalk.white.bgRed.bold(`${test.suiteName} > ${test.name}`)
					);
					test.errors.forEach(function(err) {
						if (err.stack) {
							errOut.push(chalk.red(err.stack.replace('/\\n/i', '\n')));
						} else {
							errOut.push(chalk.red('No stacktrace supplied :('));
						}
						errOut.push('');
					});
				} else {
					out.push(
						chalk.green(`${test.suiteName} > ${test.name}`) + timeString
					);
				}
			});
		} else {
			errOut.push('');
			errOut.push(`Browser: ${chalk.red.bold(browserRes.browser)}`);
			errOut.push(
				chalk.white.bgRed.bold('No tests ran, something went horribly wrong!')
			);
			out.push(
				chalk.white.bgRed.bold('No tests ran, something went horribly wrong!')
			);
		}
	});

	const hadErrors = errOut.length;

	if (hadErrors) {
		fail(logger);
	} else {
		succ(logger);
	}

	out.forEach(line => logger.log(line));
	if (errOut.length) {
		errOut.forEach(line => logger.error(line));
	}

	return !hadErrors;
}

// http://patorjk.com/software/taag/#p=display&f=JS%20Stick%20Letters&t=ts.io
function tsio(logger) {
	logger.log('___  __      __  ');
	logger.log(' |  /__`  | /  \\ ');
	logger.log(' |  .__/ .| \\__/ ');
	logger.log('                 ');
}

// http://patorjk.com/software/taag/#p=display&f=JS%20Stick%20Letters&t=success!
function succ(logger) {
	logger.log(' __        __   __   ___  __   __    /');
	logger.log('/__` |  | /  ` /  ` |__  /__` /__`  / ');
	logger.log('.__/ \\__/ \\__, \\__, |___ .__/ .__/ .  ');
	logger.log('                                      ');
}

// http://patorjk.com/software/taag/#p=display&f=JS%20Stick%20Letters&t=failure!
function fail(logger) {
	logger.log(' ___                   __   ___   /');
	logger.log('|__   /\\  | |    |  | |__) |__   / ');
	logger.log('|    /~~\\ | |___ \\__/ |  \\ |___ .  ');
	logger.log('                                   ');
}
