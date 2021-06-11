/**
 * 执行文本替换操作后的结果
 */
class ReplaceResult {
    /**
     *
     * @param {*} textContent 文本替换后的文本内容
     * @param {*} cursorPosition 文本替换后的新光标位置
     */
    constructor(textContent, cursorPosition) {
		this.textContent = textContent;
		this.cursorPosition = cursorPosition;
	}
}

module.exports = ReplaceResult;