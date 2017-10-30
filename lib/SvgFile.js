const chalk = require("chalk");
const fs = require("fs");
const Optimizer = require("./Optimizer");
const prettyBytes = require("pretty-bytes");
const promisify = require("util").promisify;
const SVGO = require("svgo/lib/svgo");


module.exports = class SvgFile
{
    /**
     *
     * @param {string} filePath
     */
    constructor (filePath)
    {
        /**
         * @private
         * @type {string}
         */
        this.filePath = filePath;

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
        return this.loadFile()
            .then(this.optimize.bind(this))
            .then(this.runSvgo.bind(this));
    }


    /**
     * Loads the file
     *
     * @private
     * @returns {Promise}
     */
    loadFile ()
    {
        return promisify(fs.readFile)(this.filePath, "utf8");
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
        this.originalFileSize = svgData.length;

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
     * @param {number} newSize
     * @returns {string}
     */
    formatSavings (newSize)
    {
        if (newSize < 0.0001)
        {
            return chalk`{grey (unknown)}`;
        }

        const savingsFactor = Math.round(100 * newSize / this.originalFileSize, 2);
        let savings = "";

        if (newSize === this.originalFileSize)
        {
            savings = chalk`{yellow ±0%}`;
        }
        else if (savingsFactor < 100)
        {
            savings = chalk`{green.underline -${savingsFactor}%}`;
        }
        else
        {
            savings = chalk`{red.underline +${savingsFactor - 100}%}`;
        }

        return chalk`${prettyBytes(this.originalFileSize)} -> ${prettyBytes(newSize)} (${savings})`;
    }
}
