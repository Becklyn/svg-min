const fs = require("fs");
const Optimizer = require("./Optimizer");
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
}
