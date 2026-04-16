// ===== JSON 构建、同步、复制 =====

// 核心：JSON 解析
function buildJSON(node) {
    let container = node.type === 'array' ? [] : {};

    node.fields.forEach(f => {
        let val = f.value;
        if (val.toLowerCase() === "true") val = true;
        else if (val.toLowerCase() === "false") val = false;
        else if (val === "null") val = null;
        else if (!isNaN(val) && val !== "") val = Number(val);

        if (node.type === 'array') container.push(val);
        else container[f.key] = val;
    });

    node.children.forEach(c => {
        if (node.type === 'array') container.push(buildJSON(c));
        else container[c.name] = buildJSON(c);
    });

    return container;
}

// 彩虹括号颜色类
const bracketColors = [
    'bracket-level-0', 'bracket-level-1', 'bracket-level-2',
    'bracket-level-3', 'bracket-level-4', 'bracket-level-5',
    'bracket-level-6', 'bracket-level-7', 'bracket-level-8',
    'bracket-level-9'
];

// 给JSON文本添加彩虹括号和语法高亮
function highlightJSON(jsonText) {
    let result = '';
    let bracketStack = [];
    let bracketCounter = 0;

    for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];
        const nextChar = jsonText[i + 1] || '';

        // 处理字符串
        if (char === '"' || char === "'") {
            const quote = char;
            let strEnd = jsonText.indexOf(quote, i + 1);
            if (strEnd === -1) strEnd = jsonText.length;
            const str = jsonText.substring(i, strEnd + 1);

            // 判断是否是键
            const beforeStr = jsonText.substring(0, i);
            const isKey = /:\s*$/.test(beforeStr.replace(/\/\*[\s\S]*?\*\//g, ''));

            if (isKey) {
                result += `<span class="json-key">${escapeHtml(str)}</span>`;
            } else {
                result += `<span class="json-string">${escapeHtml(str)}</span>`;
            }
            i = strEnd;
            continue;
        }

        // 处理数字
        if (/[0-9-]/.test(char) && (i === 0 || /[,\s\[{]/.test(jsonText[i - 1]))) {
            let numStr = char;
            while (i + 1 < jsonText.length && /[\d.+-eE]/.test(jsonText[i + 1])) {
                i++;
                numStr += jsonText[i];
            }
            result += `<span class="json-number">${escapeHtml(numStr)}</span>`;
            continue;
        }

        // 处理布尔值
        if (char === 't' || char === 'f') {
            const boolStr = jsonText.substring(i, i + 4);
            if (boolStr === 'true' || boolStr === 'fals') {
                const fullBool = boolStr === 'true' ? 'true' : jsonText.substring(i, i + 5);
                result += `<span class="json-boolean">${escapeHtml(fullBool)}</span>`;
                i += fullBool.length - 1;
                continue;
            }
        }

        // 处理null
        if (char === 'n') {
            const nullStr = jsonText.substring(i, i + 4);
            if (nullStr === 'null') {
                result += `<span class="json-null">${escapeHtml(nullStr)}</span>`;
                i += 3;
                continue;
            }
        }

        // 处理括号
        if (char === '{' || char === '[' || char === '}' || char === ']') {
            const isOpen = char === '{' || char === '[';
            const colorClass = bracketColors[bracketCounter % bracketColors.length];

            if (isOpen) {
                bracketStack.push({ char, level: bracketCounter });
                result += `<span class="${colorClass}">${escapeHtml(char)}</span>`;
                bracketCounter++;
            } else {
                const lastBracket = bracketStack.pop();
                if (lastBracket && (lastBracket.char === '{' && char === '}' || lastBracket.char === '[' && char === ']')) {
                    bracketCounter--;
                    const closeColorClass = bracketColors[bracketCounter % bracketColors.length];
                    result += `<span class="${closeColorClass}">${escapeHtml(char)}</span>`;
                } else {
                    result += `<span class="${colorClass}">${escapeHtml(char)}</span>`;
                }
            }
            continue;
        }

        // 处理冒号和逗号
        if (char === ':' || char === ',') {
            result += `<span style="color: #999;">${escapeHtml(char)}</span>`;
            continue;
        }

        // 其他字符直接添加
        result += escapeHtml(char);
    }

    return result;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 验证JSON格式
function validateJSON(jsonText) {
    try {
        JSON.parse(jsonText);
        return { valid: true, error: null, line: null, column: null };
    } catch (e) {
        // 解析错误消息来获取行号和列号
        const errorMsg = e.message;
        let line = null;
        let column = null;
        
        // 尝试从错误消息中提取行号和列号
        const lineMatch = errorMsg.match(/position\s+(\d+)/) || errorMsg.match(/line\s+(\d+)/);
        if (lineMatch) {
            const position = parseInt(lineMatch[1]);
            const textUpToPosition = jsonText.substring(0, position);
            const lines = textUpToPosition.split('\n');
            line = lines.length;
            column = lines[lines.length - 1].length + 1;
        }
        
        const detailedError = line 
            ? `JSON语法错误\n位置: 第${line}行, 第${column}列\n${errorMsg}`
            : `JSON语法错误\n${errorMsg}`;
            
        return { valid: false, error: detailedError, line, column };
    }
}

// 同步 JSON 预览
function syncJSON() {
    const finalData = buildJSON(treeData);
    const jsonText = JSON.stringify(finalData, null, 4);
    
    // 验证JSON格式
    const validation = validateJSON(jsonText);
    
    // 添加彩虹括号和语法高亮
    const highlightedJson = highlightJSON(jsonText);
    
    if (!validation.valid) {
        // 如果JSON格式错误，给整个JSON添加错误标注
        jsonPreview.innerHTML = highlightedJson;
        
        // 添加错误指示器和背景
        const errorIndicator = document.createElement('div');
        errorIndicator.className = 'json-error';
        errorIndicator.setAttribute('data-error', validation.error);
        errorIndicator.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; z-index: 10;';
        errorIndicator.innerHTML = '<span class="json-error-indicator" style="pointer-events: auto;">⚠️ JSON格式错误</span>';
        
        jsonPreview.parentElement.style.position = 'relative';
        jsonPreview.parentElement.appendChild(errorIndicator);
    } else {
        jsonPreview.innerHTML = highlightedJson;
        
        // 移除之前的错误指示器
        const existingError = jsonPreview.parentElement.querySelector('.json-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // 生成行号
    const lines = jsonText.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('<br>');

    // 自适应行号宽度
    const maxLineNumber = lines.length;
    const digitWidth = 9;
    const paddingWidth = 20;
    const lineNumberWidth = (maxLineNumber.toString().length * digitWidth) + paddingWidth;
    lineNumbers.style.width = lineNumberWidth + 'px';
    lineNumbers.style.minWidth = 'auto';
}

// 复制 JSON 功能
window.copyJSON = () => {
    const finalData = buildJSON(treeData);
    const jsonText = JSON.stringify(finalData, null, 4);
    
    navigator.clipboard.writeText(jsonText).then(() => {
        const btn = document.getElementById('copy-btn');
        const originalText = btn.innerText;
        btn.innerText = '已复制';
        btn.style.background = '#52c41a';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
};

// 同步 JSON 源码区和行号的滚动
jsonPreview.addEventListener('scroll', () => {
    lineNumbers.scrollTop = jsonPreview.scrollTop;
});
