svg-min
=======

Minifies SVGs.


This small lib combines the following features:

* Applies transforms, so that the transforms are automatically absorbed into the paths.
* Removes unnecessary attributes.
* Moves the complete SVG, so that the origin is at `0 0`.
* Crops the artboard to only contain the actual object and no whitespace around it.
* Runs `SVGO`.


Installation
------------

```bash
npm -g i @becklyn/svg-min
```


Usage
-----

```bash
# will overwrite the original file
svg-min test.svg 

# will create the minified file in test.min.svg
svg-min test.svg --keep

# will create the minified file in out.svg
svg-min test.svg out.svg

# globs are also supported
svg-min *.svg

# if your shell automatically replaces globs use
svg-min "*.svg"
```


Caveats
-------
The implementation is pretty rudimentary and a lot of SVG features are not supported:

* The script will bail if any `transform` except `translate` is used.
* The cropping of the artboard might fail.  


Testing
-------

The test runner works with `ava`.
Just add your test case in `tests/fixtures/` with a descriptive name as `js` file:


```js
module.exports = {
    message: "This is a message describing the test case",
    in: "<svg ...>...</svg>",    
    out: "<svg ...>...</svg>",
};
```

`message` is optional.


Run the tests with `npm test`.
