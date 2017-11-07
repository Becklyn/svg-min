const SvgFile = require("./SvgFile");
const chalk = require("chalk");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const replaceExtension = require("replace-ext");
const usage = require("command-line-usage");


/**
 * @typedef {{
 *      keepOriginal: boolean,
 *      verbose: boolean,
 * }} MinifierOptions
 */

/**
 * Minifies all files
 */
module.exports = class Minifier
{
    /**
     *
     * @param {string|null} input
     * @param {string|null} output
     * @param {MinifierOptions} options
     */
    constructor (input, output, options)
    {
        /**
         * @private
         * @type {string|null}
         */
        this.input = input;

        /**
         * @private
         * @type {string|null}
         */
        this.output = output;

        /**
         * @private
         * @type {MinifierOptions}
         */
        this.options = options;
    }


    /**
     * Runs the minifier
     */
    run ()
    {
        this.printHeader();

        if (undefined === this.input)
        {
            return this.printUsage();
        }

        glob(
            this.input,
            {
                dot: false,
                nodir: true,
                absolute: true,
            },
            (error, files) =>
            {
                if (error)
                {
                    return this.printError(error.message);
                }

                if (files.length === 0)
                {
                    return this.printWarning(`No files found for input '${this.input}'.`);
                }

                if (files.length > 1 && undefined !== this.output)
                {
                    return this.printError("Can't use an explicit output file name, if more than one items are about to be transformed.");
                }

                files.forEach(
                    (filePath) =>
                    {
                        fs.readFile(
                            filePath,
                            "utf8",
                            (err, fileContent) =>
                            {
                                if (err)
                                {
                                    throw new Error(`Reading input file '${filePath}' failed: ${err.message}`);
                                }

                                const svgFile = new SvgFile(filePath, fileContent);
                                return svgFile.minify()
                                    .then(data => this.storeFile(data, svgFile, filePath))
                                    .catch(err => this.printError(err, filePath));
                            }
                        );
                    }
                );
            }
        );
    }


    /**
     * Prints the App header
     *
     * @private
     */
    printHeader ()
    {
        console.log();
        console.log("svg-min 🔩");
        console.log();
    }


    /**
     *
     * @param {{data: string, info: {width: ?number, height: ?number}}} svg
     * @param {SvgFile} svgFile
     * @param {?string} inputFilePath
     */
    storeFile (svg, svgFile, inputFilePath)
    {
        const outPath = this.generateOutputFilePath(inputFilePath);

        fs.writeFile(
            outPath,
            svg.data,
            "utf8",
            (error) =>
            {
                if (error)
                {
                    this.printError(error.message, inputFilePath);
                    return;
                }

                console.log([
                    chalk.green("Minified"),
                    path.relative(process.cwd(), inputFilePath),
                    "->",
                    chalk.yellow(path.relative(process.cwd(), outPath)) + ":",
                    svgFile.formatSavings(svg.data.length),
                ].join(" "));
            }
        );
    }


    /**
     * Generates the output file path
     *
     * @param {string} inputFilePath
     * @returns {string}
     */
    generateOutputFilePath (inputFilePath)
    {
        if (undefined !== this.output)
        {
            return path.resolve(process.cwd(), this.output);
        }

        return this.options.keepOriginal
            ? replaceExtension(inputFilePath, ".min.svg")
            : inputFilePath;
    }


    /**
     * Prints an error message
     *
     * @private
     * @param {string|Error} error
     * @param {?string} filePath
     */
    printError (error, filePath = null)
    {
        let message = "Error";

        const errorMessage = (typeof error === "string")
            ? error
            : error.message;


        if (null !== filePath)
        {
            message += ` in '${path.relative(process.cwd(), filePath)}'`;
        }

        console.log(chalk`{red ${message}:} ${errorMessage}`);

        if (this.options.verbose && typeof error !== "string")
        {
            console.log(error);
        }
    }


    /**
     * Prints a warning message
     *
     * @private
     * @param {string} message
     */
    printWarning (message)
    {
        console.log(chalk`{yellow Warning:} ${message}`);
    }


    /**
     * Prints the usage message
     */
    printUsage ()
    {
        console.log(usage([
            {
                header: "svg-min",
                content: "A simple SVG minifier.",
            },
            {
                header: "Main options",
                optionList: [
                    {
                        name: "keep",
                        description: "Automatically names the minified files .min.svg and keeps the originals.",
                    },
                ]
            },
            {
                header: "Other options",
                optionList: [
                    {
                        name: "v",
                        description: "Verbose mode. Any reported error is printed to the screen, including the stack trace. Only useful for debugging svg-min itself.",
                    },
                ]
            },
        ]));
    }
};
