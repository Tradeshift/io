import babel from 'rollup-plugin-babel';
import multiEntry from 'rollup-plugin-multi-entry';
import pkg from './package.json';

const name = 'ts.app';
const extend = true;
const sourcemap = true;

export default [
	{
		input: 'src/index.js',
		output: [
			{
				name,
				extend,
				sourcemap,
				file: pkg.main,
				format: 'cjs'
			},
			{
				name,
				extend,
				sourcemap,
				file: pkg.module,
				format: 'es'
			},
			{
				name,
				extend,
				sourcemap,
				file: pkg.browser,
				format: 'iife'
			}
		],
		plugins: [
			babel({
				exclude: 'node_modules/**'
			})
		]
	},
	{
		input: 'test/spec/**/*Spec.js',
		output: {
			name: 'spec',
			sourcemap,
			file: 'test/spec/bundle.js',
			format: 'iife'
		},
		plugins: [
			multiEntry(),
			babel({
				exclude: 'node_modules/**'
			})
		]
	}
];
