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

// 同步 JSON 预览
function syncJSON() {
    const finalData = buildJSON(treeData);
    const jsonText = JSON.stringify(finalData, null, 4);
    jsonPreview.innerText = jsonText;

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
    const jsonText = jsonPreview.innerText;
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
