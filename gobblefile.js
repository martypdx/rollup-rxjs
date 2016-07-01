/* globals module, require, __dirname */
const gobble = require( 'gobble' );
const nodeResolve = require( 'rollup-plugin-node-resolve' );

var path = require( 'path' );
var r = require( 'rollup' );

function rollup ( inputdir, outputdir, options ) {
	if ( !options.entry ) {
		throw new Error( 'You must supply `options.entry`' );
	}

	// TODO gobble needs `this.cache`, not a hack
	var node = this.node;
	if ( options.cache !== false ) options.cache = node.cache;

	options.dest = path.resolve( outputdir, options.dest || options.entry );
	options.entry = path.resolve( inputdir, options.entry );

	return r.rollup( options ).then( function ( bundle ) {
		node.cache = bundle;
		return bundle.write( options );
	})
	.catch ( err => {
		console.log( err );
		throw err;
	});
};
	
const index = gobble( '.' ).include( 'index.js' );

class RollupRx {
	
	constructor( options ){
		console.log( 'plugin constructor' );
		this.options = options;
	}

	resolveId( id ){
		console.log( id );
		if ( id.startsWith('rxjs/') ) {
			return `${__dirname}/node_modules/rxjs-es/${id.replace('rxjs/', '')}.js`;
		}
	}
}

const rollupRx = config => new RollupRx( config );

const bundle = index
	.transform( rollup, {
		entry: 'index.js',
		plugins: [
			rollupRx,
			nodeResolve({ jsnext: true, main: true })
		],
		dest: 'bundle.js',
		format: 'iife'
	});

module.exports = bundle;
