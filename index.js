const argv = require("minimist")(process.argv.slice(2));
const Minifier = require("./lib/Minifier");


const minifier = new Minifier(
    argv._[0],
    argv._[1], {
        keepOriginal: argv.keep === true,
        verbose: argv.v === true,
    }
);
minifier.run();
