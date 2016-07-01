# rollup-rxjs

Sample bundling project for rolling up rxjs

Until next beta release, RxJs won't work correctly due to dependency on non-ES5 module.

However, you can work around _if_ older version of 
`symbol-observable` is removed from `rxjs-es`:

```
> npm i //includes new stand-alone `symbol-observable` dependency
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

