const assert = require('node:assert/strict');
const {decodeNumericHtmlEntities} = require('../../../../../core/server/services/email-rendering/decode-numeric-html-entities');

describe('decodeNumericHtmlEntities', function () {
    it('decodes hex numeric character references to UTF-8', function () {
        const html = '<p>&#xC4;</p><p>&#xE4;</p><p>&#xD6;</p><p>&#xF6;</p><p>&#xDC;</p><p>&#xFC;</p><p>&#xDF;</p>';
        const result = decodeNumericHtmlEntities(html);

        assert.equal(result, '<p>Ä</p><p>ä</p><p>Ö</p><p>ö</p><p>Ü</p><p>ü</p><p>ß</p>');
    });

    it('decodes decimal numeric character references to UTF-8', function () {
        assert.equal(decodeNumericHtmlEntities('&#196;'), 'Ä');
        assert.equal(decodeNumericHtmlEntities('&#39;'), '\'');
    });

    it('leaves named entities unchanged', function () {
        const html = '<p>&lt;tag&gt;</p><a href="http://example.com?a=1&amp;b=2">link</a>';
        assert.equal(decodeNumericHtmlEntities(html), html);
    });

    it('decodes numeric entities in attributes without touching ampersand escapes', function () {
        const html = '<div style="background: url(&#39;https://example.com/a.jpg&#39;)"></div>';
        assert.equal(decodeNumericHtmlEntities(html), '<div style="background: url(\'https://example.com/a.jpg\')"></div>');
    });
});
