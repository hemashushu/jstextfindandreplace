const assert = require('assert/strict');

const {MatchItem,
    SubMatchItem,
    PartialTextContent,
    ReplaceResult,
    TextFindAndReplace } = require('../index');

describe('TextFindAndReplace Test', () => {
    it('Test find()', () => {
        let text1 = 'hello foo bar world';

        let ptext1 = new PartialTextContent(0, text1);

        let matchItems1 = TextFindAndReplace.find([ptext1],'foo',false, false, false);
        assert.equal(1, matchItems1.length);

        let matchItem1 = matchItems1[0];
        assert.equal(matchItem1.start, 6);
        assert.equal(matchItem1.end, 9);
        assert.equal(matchItem1.textContent, 'foo');
        // TODO::
    });

});