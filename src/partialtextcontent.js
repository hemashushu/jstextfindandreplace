/**
 * 文本块，即整篇文本的指定范围的部分文本内容
 *
 * 当前模块支持在多个指定的范围内查找（比如在标题中查找），则
 * 每一个指定范围就是一个 PartialTextContent 对象。
 */
class PartialTextContent {
    /**
     *
     * @param {*} offset 当前文本块在整篇文本当中的开始索引值
     * @param {*} textContent 当前文本块的文本内容
     */
    constructor(offset, textContent) {
        this.offset = offset;
        this.textContent = textContent;
    }
}

module.exports = PartialTextContent;