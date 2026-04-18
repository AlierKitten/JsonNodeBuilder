// ===== JSON 构建、同步、复制 =====

// DOM 引用
const jsonInput = document.getElementById('json-input');
const jsonHighlight = document.getElementById('json-highlight');

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

// ===== 彩虹括号高亮 =====

const bracketColors = [
    'bracket-level-0', 'bracket-level-1', 'bracket-level-2',
    'bracket-level-3', 'bracket-level-4', 'bracket-level-5',
    'bracket-level-6', 'bracket-level-7', 'bracket-level-8',
    'bracket-level-9'
];

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightJSON(jsonText) {
    let result = '';
    let bracketStack = [];
    let bracketCounter = 0;

    for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];

        // 处理字符串
        if (char === '"') {
            let strEnd = jsonText.indexOf('"', i + 1);
            if (strEnd === -1) strEnd = jsonText.length;
            const str = jsonText.substring(i, strEnd + 1);

            const beforeStr = jsonText.substring(0, i);
            const isKey = /:\s*$/.test(beforeStr);

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
            result += `<span class="json-punctuation">${escapeHtml(char)}</span>`;
            continue;
        }

        // 其他字符直接添加
        result += escapeHtml(char);
    }

    return result;
}

function updateHighlight() {
    jsonHighlight.innerHTML = highlightJSON(jsonInput.value);
}

// ===== JSON 反向转换 =====

let nodeIdCounter = 1;
function generateNodeId() {
    return 'n' + (nodeIdCounter++);
}

const NODE_HORIZONTAL_GAP = 300;
const NODE_VERTICAL_GAP = 30;

function parseJSONToTree(jsonData, name = 'root', x = 50, y = 50, depth = 0) {
    const id = generateNodeId();
    
    if (Array.isArray(jsonData)) {
        const node = { id, name, type: 'array', x, y, fields: [], children: [] };
        let currentY = y;
        const childX = x + NODE_HORIZONTAL_GAP;
        
        jsonData.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
                const child = parseJSONToTree(item, `[${index}]`, childX, currentY, depth + 1);
                node.children.push(child);
                currentY = child.y + getNodeHeight(child) + NODE_VERTICAL_GAP;
            } else {
                node.fields.push({ id: generateNodeId(), key: String(index), value: String(item) });
            }
        });
        return node;
    } else if (typeof jsonData === 'object' && jsonData !== null) {
        const node = { id, name, type: 'object', x, y, fields: [], children: [] };
        let currentY = y;
        const childX = x + NODE_HORIZONTAL_GAP;
        
        Object.entries(jsonData).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                const child = parseJSONToTree(value, key, childX, currentY, depth + 1);
                node.children.push(child);
                currentY = child.y + getNodeHeight(child) + NODE_VERTICAL_GAP;
            } else {
                node.fields.push({ id: generateNodeId(), key, value: value === null ? 'null' : String(value) });
            }
        });
        return node;
    } else {
        return { id, name, type: 'value', x, y, fields: [{ id: generateNodeId(), key: '', value: String(jsonData) }], children: [] };
    }
}

function importJSONFromText(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        nodeIdCounter = 1;
        const newTree = parseJSONToTree(data);
        
        treeData.id = newTree.id;
        treeData.name = newTree.name;
        treeData.type = newTree.type;
        treeData.fields = newTree.fields;
        treeData.children = newTree.children;
        
        panX = 0;
        panY = 0;
        currentZoom = 1;
        updateZoomStyles();
        
        render();
        resizeCanvas();
        applyTransform();
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ===== 格式化 JSON =====

window.formatJSON = () => {
    const jsonText = jsonInput.value;
    try {
        const parsed = JSON.parse(jsonText);
        const formatted = JSON.stringify(parsed, null, 4);
        jsonInput.value = formatted;
        updateHighlight();
        updateLineNumbers();
        showStatusBar('格式化成功', 'success');
    } catch (e) {
        showStatusBar('格式化失败: ' + e.message, 'error');
    }
};

// ===== 状态提示条 =====

function showStatusBar(message, type = 'info') {
    const errorBar = document.getElementById('json-error-bar');
    errorBar.textContent = message;
    errorBar.className = 'json-error-bar show ' + type;
    
    setTimeout(() => {
        errorBar.classList.remove('show');
    }, 3000);
}

// ===== 行号更新 =====

function updateLineNumbers() {
    const jsonText = jsonInput.value;
    const lines = jsonText.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('<br>');
    
    const maxLineNumber = lines.length;
    const digitWidth = 9;
    const paddingWidth = 20;
    const lineNumberWidth = (maxLineNumber.toString().length * digitWidth) + paddingWidth;
    lineNumbers.style.width = lineNumberWidth + 'px';
}

// 同步 JSON 源码
function syncJSON() {
    const finalData = buildJSON(treeData);
    const jsonText = JSON.stringify(finalData, null, 4);
    
    jsonInput.value = jsonText;
    updateHighlight();
    updateLineNumbers();

    const errorBar = document.getElementById('json-error-bar');
    errorBar.className = 'json-error-bar';
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

// ===== 事件绑定 =====

// 同步滚动
jsonInput.addEventListener('scroll', () => {
    jsonHighlight.scrollTop = jsonInput.scrollTop;
    jsonHighlight.scrollLeft = jsonInput.scrollLeft;
    lineNumbers.scrollTop = jsonInput.scrollTop;
});

jsonHighlight.addEventListener('scroll', () => {
    jsonInput.scrollTop = jsonHighlight.scrollTop;
    jsonInput.scrollLeft = jsonHighlight.scrollLeft;
    lineNumbers.scrollTop = jsonHighlight.scrollTop;
});

// 实时验证和自动更新
let isUpdatingFromCanvas = false;

jsonInput.addEventListener('input', () => {
    if (isUpdatingFromCanvas) return;
    
    updateHighlight();
    updateLineNumbers();
    
    const jsonText = jsonInput.value;
    const errorBar = document.getElementById('json-error-bar');
    
    if (!jsonText.trim()) {
        errorBar.className = 'json-error-bar';
        return;
    }
    
    try {
        JSON.parse(jsonText);
        errorBar.textContent = '✓ JSON 格式正确，已生成预览';
        errorBar.className = 'json-error-bar show success';
        importJSONFromText(jsonText);
    } catch (e) {
        errorBar.textContent = '✗ JSON 格式错误: ' + e.message;
        errorBar.className = 'json-error-bar show';
    }
});

// Tab 键支持
jsonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = jsonInput.selectionStart;
        const end = jsonInput.selectionEnd;
        jsonInput.value = jsonInput.value.substring(0, start) + '    ' + jsonInput.value.substring(end);
        jsonInput.selectionStart = jsonInput.selectionEnd = start + 4;
        updateHighlight();
        updateLineNumbers();
    }
});

// 保持 textarea 和 highlight 层同步
jsonInput.addEventListener('focus', () => {
    jsonHighlight.classList.add('active');
});

jsonInput.addEventListener('blur', () => {
    jsonHighlight.classList.remove('active');
});

// 初始化
updateHighlight();
updateLineNumbers();
