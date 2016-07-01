# rollup-rxjs

Sample bundling project for rolling up rxjs

Until next beta release, RxJs won't work correctly due to dependency on non-ES5 module.

However, you can work around by:
* Including a stand-alone `symbol-observable` dependency (latest is `1.0.1`) in your project
* removing older version of `symbol-observable` from `rxjs-es` after install

```
> npm i 
> rm -rf node_modules/rxjs-es/node_modules
```

build with:

```
> node rollup.js
```

then run:

```
> node bundle.js
```

