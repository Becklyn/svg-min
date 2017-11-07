const svgjs = require("svg.js");
const window = require("svgdom");
const xml2js = require("xml2js");


const STRIPPED_ATTRIBUTES = /^(id|data-.*?)$/;
const ALLOWED_ROOT_ATTRIBUTES = /^(xmlns|viewBox|class)$/;

/**
 * Inlines all `translate`s, remove unneeded attributes and crops the artboard.
 *
 * @type {module.Optimizer}
 */
module.exports = class Optimizer
{
    /**
     * @param {string} svgData
     */
    constructor (svgData)
    {
        const handler = svgjs(window)(window.document);

        /**
         * @private
         * @type {svgjs.Doc}
         */
        this.svgDocument = handler.svg(svgData);
    }


    /**
     * @returns {Promise}
     */
    inline ()
    {
        // don't touch the root SVG node, as it is used internally by SVG.js
        this.svgDocument.children().forEach(
            child => this.inlineOnElement(child, 0, 0)
        );

        const rbox = this.svgDocument.rbox();

        this.svgDocument.children().forEach(
            child => this.moveToOrigin(child, -rbox.x, -rbox.y)
        );

        return this.removeDuplicateSVG(
            this.svgDocument.svg()
        );
    }


    /**
     * @private
     * @param {SVG.Element} element
     * @param {number} offsetX
     * @param {number} offsetY
     */
    inlineOnElement (element, offsetX, offsetY)
    {
        /** @type {SVG.Matrix} transform */
        const transform = element.transform();

        if (0 !== transform.skewX || 0 !== transform.skewY || 1 !== transform.scaleX || 1 !== transform.scaleY || 0 !== transform.rotation)
        {
            throw new Error("Can't inline transform that is more than a translate.");
        }

        offsetX += transform.x;
        offsetY += transform.y;

        element.dmove(offsetX, offsetY);
        element.untransform();
        this.removeAttributes(element);

        if (element.children !== undefined)
        {
            element.children().forEach(
                child => this.inlineOnElement(child, offsetX, offsetY)
            );
        }
    }


    /**
     * Strips unnecessary attributes
     *
     * @private
     * @param {SVG.Element} element
     */
    removeAttributes (element)
    {
        const attributes = element.attr();
        for (const key in attributes)
        {
            if (attributes.hasOwnProperty(key) && STRIPPED_ATTRIBUTES.test(key))
            {
                element.attr(key, null);
            }
        }
    }

    /**
     * Move to origin
     *
     * @param {SVG.Element} element
     * @param {number} offsetX
     * @param {number} offsetY
     */
    moveToOrigin (element, offsetX, offsetY)
    {
        switch (element.node.nodeName)
        {
            case "svg":
                this.modifyViewBox(element, offsetX, offsetY);
                break;

            case "g":
                // don't do anything
                break;

            default:
                element.dmove(offsetX, offsetY);
                break;
        }


        if (element.children !== undefined)
        {
            element.children().forEach(
                child => this.moveToOrigin(child, offsetX, offsetY)
            );
        }
    }


    /**
     * Modifies the view box to adjust for the offset
     *
     * @param {SVG.Element} element
     * @param {number} offsetX
     * @param {number} offsetY
     */
    modifyViewBox (element, offsetX, offsetY)
    {
        // the .viewBox() getter fails, if there is no viewBox
        const attrs = element.attr();

        if (typeof attrs.viewBox !== "string")
        {
            return;
        }

        const parts = attrs.viewBox.split(" ");
        parts[0] = parseFloat(parts[0], 10) + offsetX;
        parts[1] = parseFloat(parts[1], 10) + offsetX;
        attrs.viewBox = parts.join(" ");
        element.attr(attrs);
    }


    /**
     * Removes the duplicate <svg><svg>...</svg></svg>
     *
     * @param {string} svgData
     * @returns {Promise}
     */
    removeDuplicateSVG (svgData)
    {
        return new Promise(
            (resolve, reject) =>
            {
                xml2js.parseString(
                    svgData,
                    {
                        attrkey: "$",
                        explicitArray: true,
                    },
                    (error, xml) =>
                    {
                        if (error)
                        {
                            return reject(error);
                        }

                        if (!('svg' in xml))
                        {
                            return reject(new Error("Invalid SVG before simplification: no root SVG found."));
                        }

                        const rootNode = xml.svg;

                        // forward compatible: if the second level SVG is missing some day, just don't do anything.
                        if (!('svg' in rootNode))
                        {
                            return resolve(svgData);
                        }

                        if (!this.areValidRootChildren(rootNode))
                        {
                            return reject(new Error("Invalid SVG before simplification: mixed <svg> with other nodes on the second level."));
                        }


                        if (rootNode.svg.length > 1)
                        {
                            return reject(new Error("Invalid SVG before simplification: multiple <svg> on the second level found."));
                        }

                        // move attributes and children
                        const childNode = rootNode.svg[0];
                        rootNode.$ = this.mergeAndStripAttributes(rootNode.$, childNode.$);
                        xml.svg = this.moveChildren(rootNode, childNode);

                        try
                        {
                            resolve((new xml2js.Builder()).buildObject(xml));
                        }
                        catch (e)
                        {
                            reject(e);
                        }
                    }
                );
            }
        );
    }


    /**
     * Checks whether the children of the root element are valid
     *
     * @param {object} rootNode
     * @returns {boolean}
     */
    areValidRootChildren (rootNode)
    {
        const keys = Object.keys(rootNode);
        const allowedKeys = {$: true, defs: true, svg: true};

        for (let i = 0; i < keys.length; i++)
        {
            if (allowedKeys[keys[i]] === undefined)
            {
                return false;
            }
        }

        return true;
    }


    /**
     * Merges and strips the attributes
     *
     * Strips everything except the allowed root attributes.
     *
     * @private
     * @param {object} rootAttributes
     * @param {object} childAttributes
     * @returns {object}
     */
    mergeAndStripAttributes (rootAttributes, childAttributes)
    {
        const merged = {};

        [rootAttributes, childAttributes].forEach(
            (attrs) =>
            {
                for (const key in attrs)
                {
                    if (!attrs.hasOwnProperty(key))
                    {
                        continue;
                    }

                    if (ALLOWED_ROOT_ATTRIBUTES.test(key))
                    {
                        merged[key] = attrs[key];
                    }
                }
            }
        );

        return merged;
    }


    /**
     * Moves the children to the root node
     *
     * @private
     * @param {object} rootNode
     * @param {object} childNode
     * @returns {object}
     */
    moveChildren (rootNode, childNode)
    {
        const newChildren = {};
        newChildren.$ = rootNode.$;

        for (const key in childNode)
        {
            if (!childNode.hasOwnProperty(key) || "$" === key)
            {
                continue;
            }

            newChildren[key] = childNode[key];
        }

        return newChildren;
    }
}
