const assert = require('node:assert/strict');
const {decodeNumericHtmlEntities} = require('../../../../../core/server/services/email-rendering/decode-numeric-html-entities');

describe('decodeNumericHtmlEntities', function () {
    it('decodes hex numeric character references to UTF-8', function () {
        const html = '<p>&#xC4;</p><p>&#xE4;</p><p>&#xD6;</p><p>&#xF6;</p><p>&#xDC;</p><p>&#xFC;</p><p>&#xDF;</p>';
        const result = decodeNumericHtmlEntities(html);

        assert.equal(result, '<p>Ä</p><p>ä</p><p>Ö</p><p>ö</p><p>Ü</p><p>ü</p><p>ß</p>');
    });

    it('decodes uppercase hex numeric character references to UTF-8', function () {
        assert.equal(decodeNumericHtmlEntities('&#XDC;'), 'Ü');
    });

    it('decodes decimal numeric character references to UTF-8', function () {
        assert.equal(decodeNumericHtmlEntities('&#196;'), 'Ä');
        assert.equal(decodeNumericHtmlEntities('&#39;'), '\'');
    });

    it('collapses double-escaped numeric character references before decoding', function () {
        const html = '<p>&amp;#xC4;&amp;#xD6;&amp;#xDC;&amp;#xE4;&amp;#xF6;&amp;#xFC;&amp;#xDF;&amp;#xA0;&#xA0;</p>';
        const result = decodeNumericHtmlEntities(html);

        assert.equal(result, '<p>ÄÖÜäöüß\u00A0\u00A0</p>');
    });

    it('leaves named entities unchanged', function () {
        const html = '<p>&lt;tag&gt;</p><a href="http://example.com?a=1&amp;b=2">link</a>';
        assert.equal(decodeNumericHtmlEntities(html), html);
    });

    it('collapses double-escaped named entities one layer without turning them into HTML', function () {
        const html = '<p>&amp;lt;script&amp;gt;alert(&amp;quot;x&amp;quot;)&amp;lt;/script&amp;gt;</p>';
        const result = decodeNumericHtmlEntities(html);

        assert.equal(result, '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>');
    });

    it('decodes numeric entities in attributes without touching ampersand escapes', function () {
        const html = '<div style="background: url(&#39;https://example.com/a.jpg&#39;)"></div>';
        assert.equal(decodeNumericHtmlEntities(html), '<div style="background: url(\'https://example.com/a.jpg\')"></div>');
    });
});
