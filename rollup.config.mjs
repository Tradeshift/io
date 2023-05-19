import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import pkg from './package.json' assert { type: 'json' };;

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
		nodeResolve({
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
			babelHelpers: "bundled",
			exclude: /node_modules\/(?!uuid)/,
			presets: [
				[
					"@babel/preset-env",
					{
						"useBuiltIns": "usage",
						"corejs": 3,
					}
				]
			],
			plugins: [
				'@babel/proposal-class-properties',
				[
					'@babel/plugin-transform-runtime',
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
