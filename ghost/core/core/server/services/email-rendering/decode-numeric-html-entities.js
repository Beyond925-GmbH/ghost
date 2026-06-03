/**
 * Decode numeric HTML character references (&#xHH; and &#DDD;) to UTF-8.
 *
 * Cheerio serializes non-ASCII text as hex entities. Many email clients render
 * those literally instead of as characters, especially for German umlauts.
 * Named entities such as &lt; and &amp; are left unchanged.
 *
 * @param {string} html
 * @returns {string}
 */
function decodeNumericHtmlEntities(html) {
    return html
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

module.exports = {
    decodeNumericHtmlEntities
};
