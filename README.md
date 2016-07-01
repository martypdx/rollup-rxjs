# rollup-rxjs

Sample bundling project for rolling up your code that depends on [rxjs](https://github.com/ReactiveX/rxjs)

[Until next beta release](https://github.com/ReactiveX/rxjs/issues/1785), rxjs won't work correctly due to dependency on non-ES6 module.

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

