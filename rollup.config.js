import fs from 'fs';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

const name = 'ts.io';
const extend = true;
const sourcemap = true;

const outputConfig = {
	name,
	extend,
	sourcemap
};

const umd = (input, output) => ({
	input,
	output: [
		{
			...outputConfig,
			file: output,
			format: 'umd'
		}
	],
	plugins: [
		globals(),
		builtins(),
		resolve({
			module: true,
			jsnext: true,
			main: true,
			browser: true
		}),
		commonjs({
			include: 'node_modules/**'
		}),
		babel({
			babelrc: false,
			exclude: 'node_modules/**',
			presets: [
				[
					'@babel/env',
					{
						modules: false,
						useBuiltIns: 'usage'
					}
				]
			],
			plugins: [
				'@babel/proposal-class-properties',
				[
					'@babel/transform-runtime',
					{
						helpers: false,
						regenerator: true
					}
				]
			]
		})
	]
});

const config = [
	umd('src/idx.js', pkg.browser),
	{
		input: 'src/idx.js',
		external: ['uuid'],
		output: [
			{
				...outputConfig,
				file: pkg.main,
				format: 'cjs'
			},
			{
				...outputConfig,
				file: pkg.module,
				format: 'es'
			}
		]
	}
];

const TEST_DIR = 'test/spec/';
const TEST_OUT_DIR = 'test/jasmine/spec/';

fs.readdirSync(TEST_DIR).forEach(fileName => {
	if (fileName.endsWith('.js')) {
		config.push(umd(TEST_DIR + fileName, TEST_OUT_DIR + fileName));
	}
});

export default config;
