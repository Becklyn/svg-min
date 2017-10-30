const chalk = require("chalk");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const replaceExtension = require("replace-ext");
const SvgFile = require("./SvgFile");


module.exports = class Minifier
{
    constructor (input, output)
    {
        /**
         * @private
         * @type {string}
         */
        this.input = input;

        /**
         * @private
         * @type {string | null}
         */
        this.output = output;
    }


    /**
     * Runs the minifier
     */
    run ()
    {
        if (undefined === this.input)
        {
            this.printError("No input file given.");
            return;
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
                    this.printError(error);
                    return;
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
        const outPath = (undefined !== this.output)
            ? path.resolve(process.cwd(), this.output)
            : replaceExtension(inputFilePath, ".min.svg");

        fs.writeFile(
            outPath, svg.data, "utf8",
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
