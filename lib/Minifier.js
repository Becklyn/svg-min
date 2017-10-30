const chalk = require("chalk");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const replaceExtension = require("replace-ext");
const SvgFile = require("./SvgFile");


/**
 * Minifies all files
 */
module.exports = class Minifier
{
    /**
     *
     * @param {string|null} input
     * @param {string|null} output
     * @param {boolean} keepOriginal
     */
    constructor (input, output, keepOriginal)
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
         * @type {boolean}
         */
        this.keepOriginal = keepOriginal;
    }


    /**
     * Runs the minifier
     */
    run ()
    {
        if (undefined === this.input)
        {
            return this.printError("No input file given.");
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

                if (files.length > 1 && undefined !== this.output)
                {
                    return this.printError("Can't use an explicit output file name, if more than one items are about to be transformed.");
                }

                files.forEach(
                    (filePath) =>
                    {
                        const svgFile = new SvgFile(filePath);
                        svgFile.minify()
                            .then(data => this.storeFile(data, svgFile, filePath))
                            .catch(err => this.printError(err.message, filePath));
                    }
                );
            }
        );
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

        return this.keepOriginal
            ? replaceExtension(inputFilePath, ".min.svg")
            : inputFilePath;
    }


    /**
     *
     * @private
     * @param {string} errorMessage
     * @param {?string} filePath
     */
    printError (errorMessage, filePath = null)
    {
        let message = "Error";

        if (null !== filePath)
        {
            message += ` in '${path.relative(process.cwd(), filePath)}'`;
        }

        console.log(chalk`{red ${message}:} ${errorMessage}`);
    }
};
