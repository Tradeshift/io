import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
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

const umd = (input, output, extras = {}) => ({
	input,
	output: [
		{
			...outputConfig,
			file: output,
			format: 'umd',
			...extras
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
		json({
			preferConst: true // Default: false
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
	umd('src/index.js', pkg.browser),
	{
		input: 'src/index.js',
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
	},
	umd('test/app/app.js', 'test/jasmine/spec/app.js', { sourcemap: 'inline' }),
	umd('test/spec/ts.io.spec.js', 'test/jasmine/spec/ts.io.spec.js', {
		sourcemap: 'inline'
	})
];

export default config;
