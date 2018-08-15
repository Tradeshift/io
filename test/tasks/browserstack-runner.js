const chalk = require('chalk');
const browserStackRunner = require('browserstack-runner');
const config = require('./browserstack.json');
const testServer = require('./test-server');
const ports = require('../config.json');

config['test_server_port'] = ports.base;

/**
 * Check the report and pretty-print to the console
 * @see https://github.com/browserstack/browserstack-runner#usage-as-a-module
 * @param report BrowserStack report
 * @returns {boolean} true on success, false on failure
 */
const checkReport = report => {
	let out = [];
	let errOut = [];

	if (!report.length) {
		console.log(
			'No report received, probably because the build has been terminated...'
		);
		console.log(
			'Check the tests runs! https://travis-ci.org/Tradeshift/io/pull_requests'
		);
		fail();
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
				if (test.runtime > 500) {
					timeString = chalk.red(timeString);
				} else if (test.runtime < 100) {
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

	out.forEach(line => console.log(line));
	errOut.forEach(line => console.log(line));

	return !errOut.length;
};

testServer((baseServer, crossdomainServer) =>
	browserStackRunner.run(config, (err, report) => {
		crossdomainServer.close();
		baseServer.close();

		if (err) {
			console.log('Error:' + err);
			process.exit(2);
		}
		if (checkReport(report)) {
			process.exit(0);
		} else {
			process.exit(1);
		}
	})
);
