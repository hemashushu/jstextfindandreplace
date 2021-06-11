const MatchItem = require('./matchitem');

/**
 * 在“多关键字行查找”模式里查找到的一项匹配项
 *
 * - 在“多关键字行查找”模式里，查找的结果是一整行文本。
 *   所以这里的 start, end 也是行的开始和结束位置。
 * - 因为是多关键字查找，所以在一行里会部分文本
 *   匹配中一个或多个关键字，这里使用 SubMatchItem 数组表示。
 */
class LineMatchItem extends MatchItem{
    /**
     *
     * @param {*} start 行开始索引。
     *     需注意当前模块支持多文本块查找，这里的索引值是相对于整篇文本而言，而
     *     不是相对文本块的。
     * @param {*} end 行结束索引（索引不包括）
     * @param {*} textContent 行的正文内容，不包括换行符
     *     注意行可能包含有换行符，所以 end 的值不一定是 start + textContent.length。
     * @param {*} subMatchItems SubMatchItem 对象数组 [SubMatchItem, ...]，子匹配项
     *     注意只查找 excludeKeywords 时，或者同时查找 “includeKeywords” 和 “excludeKeywords”，
     *     但没有匹配中全部 “includeKeywords” 时，subMatchItems 是个空数组。
     */
    constructor(start, end, textContent, subMatchItems) {
        super(start, end, textContent);
        this.subMatchItems = subMatchItems;
    }
}

module.exports = LineMatchItem;