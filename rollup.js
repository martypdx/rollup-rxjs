const rollup = require( 'rollup' );
const nodeResolve = require( 'rollup-plugin-node-resolve' );
const commonjs = require( 'rollup-plugin-commonjs' );

// found this online, does correctly rewrite the rxjs paths
class RollupRx {
	constructor(options){
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
	// have no idea which of these might be helpful...
	plugins: [
		nodeResolve({ main: true, jsnext: true }),
		commonjs({ include: 'node_modules/**' }),
		rollupRx,
	]
}).then( bundle => {
	bundle.write({
		format: 'iife',
		dest: 'bundle.js'
	});
});