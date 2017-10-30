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
        this.fileLength = 0;
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
        this.fileLength = svgData.length;

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


    formatSavings (newSize)
    {
        if (newSize < 0.0001)
        {
            return chalk`{grey (unknown)}`;
        }

        const savingsFactor = Math.round(100 * newSize / this.fileLength, 2);

        const savings = (savingsFactor < 100)
            ? chalk`{green.underline -${savingsFactor}%}`
            : chalk`{red.underline +${savingsFactor - 100}%}`;

        return chalk`${prettyBytes(this.fileLength)} -> ${prettyBytes(newSize)} (${savings})`;
    }
}
