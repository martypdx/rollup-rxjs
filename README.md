# rollup-rxjs

Sample bundling project for rolling up rxjs

Things are currently working _if_ extraneous older version of 
`symbol-observable` is removed from `rxjs-es`:

```
> npm i
> rm -rf node_modules/rxjs-es/node_modules
```

Then build with:

```
> node rollup.js
```

And run:

```
> node bundle.js
```

