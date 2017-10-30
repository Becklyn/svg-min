const argv = require("minimist")(process.argv.slice(2));
const Minifier = require("./lib/Minifier");


const minifier = new Minifier(argv._[0], argv._[1], argv.keep === true);
minifier.run();
