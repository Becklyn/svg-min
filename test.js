import SvgFile from "./lib/SvgFile";
import fs from "fs";
import glob from "glob";
import path from "path";
import test from "ava";
import {promisify} from "util";


const FIXTURES_DIR = `${__dirname}/tests/fixtures`;

const directories = glob.sync(
    `${FIXTURES_DIR}/*/`,
    {
        absolute: true,
    }
);

directories.forEach(dir => runTest(dir));
const readFile = promisify(fs.readFile);


/**
 * Registers a single test
 *
 * @param {string} dir
 */
function runTest(dir)
{
    test(
        `Test Case: ${path.basename(dir)}`,
        (assert) =>
        {
            const inputPath = `${dir}/in.svg`;

            return Promise.all([
                readFile(inputPath),
                readFile(`${dir}/out.svg`),
                readFile(`${dir}/message.txt`),
            ])
            .then(
                async (data) =>
                {
                    const input = data[0].toString();
                    // trim output content, so that trailing slashes don't matter
                    const output = data[1].toString().trim();
                    const message = data[2].toString();

                    const svg = new SvgFile(inputPath, input);
                    assert.is((await svg.minify()).data, output, message);
                },
                (err) => t.fail(err)
            );
        }
    );
}
