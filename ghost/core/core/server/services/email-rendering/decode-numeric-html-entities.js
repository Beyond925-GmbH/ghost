/**
 * Decode numeric HTML character references (&#xHH;, &#XHH; and &#DDD;) to UTF-8.
 *
 * Cheerio serializes non-ASCII text as hex entities. Some email clients render
 * those literally when an extra escaping layer turns them into &amp;#xHH;.
 * Collapse that extra layer for entity references first, then decode numeric
 * entities. Named entities such as &lt; and &amp; stay as entities for safety.
 *
 * @param {string} html
 * @returns {string}
 */
function decodeNumericHtmlEntities(html) {
    return html
        .replace(/&amp;((?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]+);)/g, '&$1')
        .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

module.exports = {
    decodeNumericHtmlEntities
};
