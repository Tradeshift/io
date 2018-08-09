import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

const name = 'ts.io';
const extend = true;
const sourcemap = true;

export default [
	{
		input: 'src/idx.js',
		output: [
			{
				name,
				extend,
				sourcemap,
				file: pkg.browser,
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
	},
	{
		input: 'src/idx.js',
		external: ['uuid'],
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
			}
		]
	}
];
