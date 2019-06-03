const {gray, green, red, underline, yellow} = require("kleur");
const Optimizer = require("./Optimizer");
const prettyBytes = require("pretty-bytes");
const SVGO = require("svgo/lib/svgo");


module.exports = class SvgFile
{
    /**
     * @param {string} filePath
     * @param {string} fileContent
     */
    constructor (filePath, fileContent)
    {
        /**
         * @private
         * @type {string}
         */
        this.filePath = filePath;

        /**
         * @private
         * @type {string}
         */
        this.fileContent = fileContent;

        /**
         * @private
         * @type {SVGO}
         */
        this.svgo = new SVGO();

        /**
         * @private
         * @type {number}
         */
        this.originalFileSize = 0;
    }


    /**
     * Minifies the given file
     *
     * @returns {Promise}
     */
    minify ()
    {
        return this.optimize(this.fileContent)
            .then(this.runSvgo.bind(this));
    }


    /**
     *
     * @private
     * @param {string} svgData
     * @returns {Promise}
     */
    optimize (svgData)
    {
        // store file length for later usage
        this.originalFileSize = Buffer.byteLength(svgData, "utf-8");

        const inliner = new Optimizer(svgData);
        return inliner.inline();
    }


    /**
     * Runs SVGO
     *
     * @private
     * @param {string} svgData
     * @returns {Promise}
     */
    runSvgo (svgData)
    {
        return this.svgo.optimize(svgData, {path: this.filePath});
    }


    /**
     * Formats the savings in relation to the original file size.
     *
     * @param {string} newFileContent
     * @returns {string}
     */
    formatSavings (newFileContent)
    {
        let newSize = Buffer.byteLength(newFileContent, "utf-8");

        if (newSize < 0.0001)
        {
            return gray(`(${unknown})`);
        }

        let savingsFactor = 100 - Math.round(100 * newSize / this.originalFileSize, 2);
        let savings = "";

        if (newSize === this.originalFileSize)
        {
            savings = yellow(`±0%`);
        }
        else if (savingsFactor < 100)
        {
            savings = green(underline(`-${savingsFactor}%`));
        }
        else
        {
            savings = red(underline(`+${savingsFactor - 100}%`));
        }

        return `${prettyBytes(this.originalFileSize)} -> ${prettyBytes(newSize)} (${savings})`;
    }
}
