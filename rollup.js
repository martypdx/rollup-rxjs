const rollup = require( 'rollup' );
const nodeResolve = require( 'rollup-plugin-node-resolve' );
const commonjs = require( 'rollup-plugin-commonjs' );

// found this online, it does seem to correctly rewrite the rxjs paths
// but is it helping or hurting?
class RollupRx {
	
	constructor( options ){
		this.options = options;
	}

	resolveId( id ){
		if(id.startsWith('rxjs/')){
			return `${__dirname}/node_modules/rxjs-es/${id.replace('rxjs/', '')}.js`;
		}
	}
}

const rollupRx = config => new RollupRx( config );

rollup.rollup({
	entry: 'index.js',
	plugins: [
		rollupRx(),
		nodeResolve({ jsnext: true, main: true }),
		// commonjs({ include: 'node_modules/**' }),
	]
}).then( bundle => {
	bundle.write({
		format: 'iife',
		dest: 'bundle.js'
	});
}).catch( err => console.error( err ) );