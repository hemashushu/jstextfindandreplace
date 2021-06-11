const { TextSelection } = require('jstextselection');

/**
 * 查找到的一项匹配项
 */
class MatchItem extends TextSelection {
    /**
     *
     * @param {*} start 匹配项（即匹配中的文本）的开始索引。
     *     需注意当前模块支持多文本块查找，这里的索引值是相对于整篇文本而言，而
     *     不是相对文本块的。
     * @param {*} end 匹配项（（即匹配中的文本）的结束索引（索引不包括）
     * @param {*} textContent 匹配中的文本内容
     */
    constructor(start, end, textContent) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super
        super(start, end);
        this.textContent = textContent;
    }
}

module.exports = MatchItem;