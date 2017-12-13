import babel from 'rollup-plugin-babel';
import multiEntry from 'rollup-plugin-multi-entry';
import pkg from './package.json';

export default [
	{
		input: 'src/index.js',
		sourcemap: true,
		name: 'ts.app',
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' },
			{ file: pkg.browser, format: 'iife' }
		],
		plugins: [
			babel({
				exclude: 'node_modules/**'
			})
		]
	},
	{
		input: {
			include: ['test/spec/**/*.js'],
			exclude: ['test/spec/bundle.js']
		},
		sourcemap: true,
		name: 'spec',
		output: { file: 'test/spec/bundle.js', format: 'iife' },
		plugins: [
			multiEntry(),
			babel({
				exclude: 'node_modules/**'
			})
		]
	}
];
