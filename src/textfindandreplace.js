const { IllegalArgumentException } = require('jsexception');
const { StringUtils } = require('jsstringutils');
const { TextLineReader } = require('jstextlinereader');

const LineMatchItem = require('./linematchitem');
const MatchItem = require('./matchitem');
const SubMatchItem = require('./submatchitem');
const PartialTextContent = require('./partialtextcontent');
const ReplaceResult = require('./replaceresult');

/**
 * 文本的查找和替换
 *
 * - 支持在多个指定文本范围（文本块）里查找
 * - 支持“多关键字行查找”模式
 */
class TextFindAndReplace {

    /**
     * 查找指定关键字的匹配项
     *
     * @param {*} partialTextContents 文本块
     * @param {*} keyword 关键字
     * @param {*} isCaseSensitive 区分大小写
     * @param {*} isWholeWord 整字匹配
     * @param {*} isRegularExpression 使用正则表达式查找，如果该参数为 true，
     *     则 keyword 必须是一个正则表达式
     * @param {*} maxMatchLimit 限定最多匹配多少项，0 表示不限制
     * @returns 返回 [MatchItem, ...]
     */
    static find(partialTextContents, keyword,
        isCaseSensitive, isWholeWord, isRegularExpression,
        maxMatchLimit = 0) {
        if (keyword === '') {
            throw new IllegalArgumentException('The keyword cannot be empty.');
        }

        let regex = TextFindAndReplace.buildFindTextRegex(keyword, isCaseSensitive, isWholeWord, isRegularExpression);
        if (regex === undefined) {
            // 用户输入的正则表达式有语法错误
            return [];
        }

        let matchItems = [];

        for (let partialTextContent of partialTextContents) {
            if (maxMatchLimit > 0 && matchItems.length >= maxMatchLimit) {
                // 匹配项数量过多
                break;
            }

            // 通过重置 regex 对象来复用 regex 对象
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
            regex.lastIndex = 0;

            let offset = partialTextContent.offset;
            let textContent = partialTextContent.textContent;

            let match = regex.exec(textContent);
            let lastPosition = -1;

            while (match !== null) {
                // 如果用户输入的正则表达式含有“可选条件”（即对于任意输入总能匹配中），比如
                // 'a*', 'a?', 'a{0,}'
                // 会导致无限循环，这里判断一下匹配中的开始索引值，以避免这种情况。
                if (lastPosition === match.index) {
                    return [];
                }

                lastPosition = match.index;

                let matchTextContent = match[0];
                let matchTextLength = matchTextContent.length;

                let matchWholePositionStart = match.index + offset; // 匹配项在整篇文本当中的索引值
                let matchWholePositionEnd = matchWholePositionStart + matchTextLength;

                let matchItem = new MatchItem(
                    matchWholePositionStart,
                    matchWholePositionEnd,
                    matchTextContent);

                matchItems.push(matchItem);

                if (maxMatchLimit > 0 && matchItems.length >= maxMatchLimit) {
                    // 匹配项数量过多
                    break;
                }

                match = regex.exec(textContent);
            }
        }

        return matchItems;
    }

    /**
     * 按行查找指定的一个或多个关键字的匹配项
     *
     * 按行查找时，空白的行会被跳过不会作任何的匹配
     *
     * @param {*} partialTextContents 文本块
     * @param {*} includeKeywords 需要出现的关键字，多个 includeKeywords 关键字之间是 AND 关系。
     * @param {*} excludeKeywords 需要排除的关键字，多个 excludeKeywords 关键字之间是 OR 关系。
     * @param {*} isCaseSensitive 区分大小写
     * @param {*} isWholeWord 整字匹配
     * @param {*} maxMatchLimit 限定最多匹配多少项，0 表示不限制
     * @returns 返回 [LineMatchItem, ...]
     */
    static findLines(partialTextContents, includeKeywords, excludeKeywords,
        isCaseSensitive, isWholeWord, maxMatchLimit = 0) {

        if (includeKeywords.length === 0 &&
            excludeKeywords.length === 0) {
            throw new IllegalArgumentException('The keywords cannot be all empty.');
        }

        let includeRegexies = includeKeywords.map((keyword) => {
            return TextFindAndReplace.buildFindLineTextRegex(keyword, isCaseSensitive, isWholeWord);
        }).filter((item) => {
            // 过滤无效的表达式
            return item !== undefined;
        });

        let excludeRegexies = excludeKeywords.map((keyword) => {
            return TextFindAndReplace.buildFindLineTextRegex(keyword, isCaseSensitive, isWholeWord);
        }).filter((item) => {
            // 过滤无效的表达式
            return item !== undefined;
        });

        if (includeRegexies.length === 0 &&
            excludeRegexies.length === 0) {
            // 全部表达式都无效
            return [];
        }

        let lineMatchItems = [];

        for (let partialTextContent of partialTextContents) {
            if (maxMatchLimit > 0 && lineMatchItems.length >= maxMatchLimit) {
                // 匹配项数量过多
                break;
            }

            // lineTextSelections 是一个 TextSelection 对象的数组，即 [TextSelection, ...]，
            // TextSelection 是一个表示行的范围（开始、结束）的对象， TextSelection: {start, end}
            let lineTextSelections = TextLineReader.getLineTextSelections(partialTextContent.textContent);

            for (let lineTextSelection of lineTextSelections) {
                // TextLine 是一个表示行文本的对象，TextLine: {offset, fullText}
                let textLine = TextLineReader.getTextLineByTextSelection(partialTextContent.textContent, lineTextSelection);

                // 当前行在整篇文本当中的索引值
                let lineWholePositionStart = partialTextContent.offset + lineTextSelection.start;
                let lineWholePositionEnd = partialTextContent.offset + lineTextSelection.end;

                // TextLine 的 textContent 属性返回的是行的正文，与 fullText 属性不同，
                // textContent 不包括换行符。
                let lineTextContent = textLine.textContent;

                // 空白行不作任何匹配
                if (lineTextContent === '') {
                    continue;
                }

                // 注意当没有匹配中 “includeKeywords” 时，subMatchItems 是个空数组。
                let subMatchItems = TextFindAndReplace.findMultipleKeywords(
                    lineTextContent,
                    includeRegexies, lineWholePositionStart, maxMatchLimit);

                let isAllKeywordsExcludes = TextFindAndReplace.isAllKeywordsExcluded(
                    lineTextContent, excludeRegexies);

                if (isAllKeywordsExcludes &&
                    (includeKeywords.length === 0 || subMatchItems.length > 0)) {

                    let lineMatchItem = new LineMatchItem(lineWholePositionStart, lineWholePositionEnd,
                        lineTextContent, subMatchItems);

                    lineMatchItems.push(lineMatchItem);

                    if (maxMatchLimit > 0 && lineMatchItems.length >= maxMatchLimit) {
                        // 匹配项数量过多
                        break;
                    }
                }
            }
        }

        return lineMatchItems;
    }

    /**
     * 在行内查找多个关键字
     *
     * @param {*} textContent 行文本
     * @param {*} includeRegexies 多关键字编译好的正则表达式对象
     * @param {*} extraOffset 行在整篇文本当中的开始位置的索引值
     * @param {*} maxMatchLimit 限定最多匹配多少项，0 表示不限制
     * @returns 返回 [SubMatchItem, ...]，如果没有匹配中全部关键字，则返回空数组。
     */
    static findMultipleKeywords(textContent, includeRegexies, extraOffset = 0, maxMatchLimit = 0) {

        let subMatchItems = [];

        for (let regex of includeRegexies) {
            // 通过重置 regex 对象来复用 regex 对象
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
            regex.lastIndex = 0;
            let match = regex.exec(textContent);

            // 因为多个 “includeKeywords” 关键字之间是 AND 关系，所以只要
            // 有一个关键字没有匹配中，则返回空数组。
            if (match === null) {
                return [];
            }

            let lastPosition = -1;

            while (match !== null) {
                // 如果用户输入的正则表达式含有“可选条件”（即对于任意输入总能匹配中），比如
                // 'a*', 'a?', 'a{0,}'
                // 会导致无限循环，这里判断一下匹配中的开始索引值，以避免这种情况。
                if (lastPosition === match.index) {
                    return [];
                }

                lastPosition = match.index;

                let matchOffset = match.index + extraOffset;
                let matchTextContent = match[0];

                let subMatchItem = new SubMatchItem(matchOffset, matchTextContent);
                subMatchItems.push(subMatchItem);

                if (maxMatchLimit > 0 && subMatchItems.length >= maxMatchLimit) {
                    // 匹配项数量过多
                    break;
                }

                match = regex.exec(textContent);
            }
        }

        // 对结果进行从小到大排序
        let sortedSubMatchItems = subMatchItems.sort((left, right) => {
            return left.offset - right.offset;
        });

        return sortedSubMatchItems;
    }

    /**
     * 判断是否所有 “excludeKeywords” 都没出现（即都没匹配中）。
     *
     * 因为 “excludeKeywords” 关键字之间是 OR 关系，即只要任何一个
     * 关键字出现了，则返回 false。
     * @param {*} textContent
     * @param {*} excludeRegexies
     * @returns 当所有 “excludeKeywords” 都没出现时，返回 true，否则返回 false。
     */
    static isAllKeywordsExcluded(textContent, excludeRegexies) {
        for (let regex of excludeRegexies) {
            // 注意 Regex 的 test() 和 exec() 方法遇到带有 /.../g 属性的正则表达式时，它是有
            // 状态的，即当次匹配可能会受到上一次匹配的影响，这里使用 exec 方法。
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec

            regex.lastIndex = 0; // reset

            if (regex.exec(textContent) !== null) {
                return false;
            }
        }

        return true;
    }

    /**
     * 替换所有匹配中项，并计算新的光标位置。
     *
     * @param {*} textContent
     * @param {*} replaceText
     * @param {*} matchItems
     * @param {*} cursorPosition 原光标位置
     * @returns 返回 ReplaceResult 对象。
     */
    static replace(
        textContent,
        replaceText,
        matchItems,
        cursorPosition) {

        // 注意不要直接使用 String.replace() 方法替换所有匹配项，因为
        // 它有可能陷入死循环。
        // 比如当用户输入的正则表达式含有“可选条件”（即对于任意输入总能匹配中），比如
        // 'a*', 'a?', 'a{0,}'
        // 会导致无限循环。
        //
        // 不过 String.replace() 比当前方法多了一个按模式替换的功能，比如下面的代码：
        //
        // if (isRegularExpression) {
        //     return content.replace(regex, replaceText);
        // } else {
        //     return content.replace(regex, () => {
        //         return replaceText;
        //     });
        // }
        //
        // 模式替换：
        //
        // $$	Inserts a "$".
        // $&	Inserts the matched substring.
        // $`	Inserts the portion of the string that precedes the matched substring.
        // $'	Inserts the portion of the string that follows the matched substring.
        // $n	Where n is a non-negative integer lesser than 100, inserts the nth
        //      parenthesized submatch string, provided the first argument was a RegExp object.
        //
        // see also:
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace

        let currentOffset = 0; // 当前正在处理的文本索引
        let positionAfter = cursorPosition; // 光标处理后的新位置

        let stringBuffer = []; // 结果字符串缓存
        for (let idx = 0; idx < matchItems.length; idx++) {
            let matchItem = matchItems[idx];
            let matchTextLength = matchItem.end - matchItem.start;

            if (matchItem.start !== currentOffset) {
                // 在“上一次处理的位置”到“这一次处理的匹配项”之间存在普通正文文本内容，
                // 把它压入缓存
                stringBuffer.push(textContent.substring(currentOffset, matchItem.start));
                currentOffset = matchItem.start;
            }

            // 把替换的目标内容压入缓存
            // 如果需要支持模式替换，就在这里处理 replaceText
            stringBuffer.push(replaceText);

            if (currentOffset < cursorPosition) {
                // 如果当前正在处理的文本位置处于原光标位置的前面（小端），则
                // 需要把光标位置后移（增大）
                positionAfter = positionAfter + (replaceText.length - matchTextLength);
            }

            currentOffset += matchTextLength;
        }

        // 把尾部剩余的正文文本内容压入缓存
        if (currentOffset !== textContent.length) {
            stringBuffer.push(textContent.substring(currentOffset, textContent.length));
        }

        let replacedTextContent = stringBuffer.join('');

        return new ReplaceResult(
            replacedTextContent,
            positionAfter);
    }

    /**
     * 构建查找字符串的正则表达式对象
     *
     * @param {*} keyword
     * @param {*} isCaseSensitive
     * @param {*} isWholeWord
     * @param {*} isRegularExpression
     * @returns 如果关键字是正则表达式且有语法错误，导致构建正则表达式对象失败，
     *     则返回 undefined，否则返回 Regex 对象
     */
    static buildFindTextRegex(keyword, isCaseSensitive, isWholeWord, isRegularExpression) {

        // 这里可以先检查一下正则表达式模式之下的 keyword（此时它为正则表达式）
        // 有无可能导致 find 过程陷入死循环的部分。
        // 比如当用户输入的正则表达式含有“可选条件”（即对于任意输入总能匹配中），如
        // 'a*', 'a?', 'a{0,}'
        // 会导致无限循环。
        //
        // 当前实现采用的是后检查方式，即在 find 方法里才检查。

        let pattern = keyword;
        if (!isRegularExpression) {
            pattern = StringUtils.escapeRegularExpress(keyword);
            if (isWholeWord) {
                pattern = '\\b' + pattern + '\\b';
            }
        }

        let flags = 'gm';
        if (!isCaseSensitive) {
            // i 表示忽略大小写
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#advanced_searching_with_flags
            flags += 'i';
        }

        try {
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
            let regex = new RegExp(pattern, flags);
            return regex;

        } catch (SyntaxError) {
            // regular expression syntax error.
        }
    }

    /**
     * 构建“行模式”查找字符串的正则表达式对象
     *
     * @param {*} keyword
     * @param {*} isCaseSensitive
     * @param {*} isWholeWord
     * @returns 如果构建正则表达式对象失败，
     *     则返回 undefined，否则返回 Regex 对象
     */
    static buildFindLineTextRegex(keyword, isCaseSensitive, isWholeWord) {
        let pattern = StringUtils.escapeRegularExpress(keyword);

        if (isWholeWord) {
            pattern = '\\b' + pattern + '\\b';
        }

        let flags = 'g';
        if (!isCaseSensitive) {
            // i 表示忽略大小写
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#advanced_searching_with_flags
            flags += 'i';
        }

        try {
            let regex = new RegExp(pattern, flags);
            return regex;

        } catch (SyntaxError) {
            // regular expression syntax error.
        }
    }

}

module.exports = TextFindAndReplace;