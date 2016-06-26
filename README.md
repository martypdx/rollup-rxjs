# rollup-rxjs

Sample bundling project for rolling up rxjs

Currents works _if_ extraneous older version of 
`symbol-observable` is removed from `rxjs-es`:

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

