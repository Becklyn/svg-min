import SvgFile from "./lib/SvgFile";
import glob from "glob";
import path from "path";
import test from "ava";


const FIXTURES_DIR = `${__dirname}/tests/fixtures`;

const files = glob.sync(
    `${FIXTURES_DIR}/**.js`,
    {
        nodir: true,
        absolute: true,
    }
);

files.forEach(file => runTest(file));



/**
 * Registers a single test
 *
 * @param {string} filePath
 */
function runTest(filePath)
{
    test(
        `Test Case: ${path.relative(FIXTURES_DIR, filePath)}`,
        async (assert) =>
        {
            /** @type {{in: string, out: string}} data */
            const data = require(filePath);

            const svg = new SvgFile(filePath, data.in);
            assert.is((await svg.minify()).data, data.out);
        }
    );
}
