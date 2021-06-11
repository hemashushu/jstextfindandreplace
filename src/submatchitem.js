/**
 * 在“多关键字行查找”模式里匹配中的一项结果当中的子匹配项。
 *
 * - 在“多关键字行查找”模式里，查找的结果是一整行文本。
 *   而在一行文本当中会部分文本匹配中一个或多个关键字，
 *   这里的 SubMatchItem 所表示的是“行内的”每一项匹配项。
 */
class SubMatchItem {
    /**
     *
     * @param {*} offset 子匹配项的开始索引。
     *     需注意当前模块支持多文本块查找，这里的索引值是相对于整篇文本而言，而
     *     不是相对文本块，也不是相对于行。
     * @param {*} textContent 子匹配项的文本内容
     */
    constructor(offset, textContent) {
        this.offset = offset;
        this.textContent = textContent;
    }
}

module.exports = SubMatchItem;