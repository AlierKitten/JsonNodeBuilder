let treeData = {
    id: "root",
    name: "JSON Object", // 仅作 UI 标识
    type: "object",
    x: 50, y: 50,
    fields: [
        { id: "f1", key: "id", value: "1" },
        { id: "f2", key: "name", value: "New Item" }
    ],
    children: []
};

const nodesLayer = document.getElementById('nodes-layer');
const svgLayer = document.getElementById('lines-svg');
const jsonPreview = document.getElementById('json-preview');
const lineNumbers = document.getElementById('line-numbers');
const canvasContainer = document.getElementById('canvas-container');
const canvasContent = document.getElementById('canvas-content');
const sidebar = document.getElementById('sidebar');

// 拖动相关变量
let isDragging = false;
let startX, startY;
let panX = 0, panY = 0;

// 缩放相关变量
let currentZoom = 1;
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;

function render() {
    // 清空画布
    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';

    // 确保从根节点开始渲染
    renderNode(treeData, null);
    syncJSON();

    // 动态调整画布大小
    resizeCanvas();
}

function renderNode(node, parentId) {
    const el = document.createElement('div');
    el.className = `node ${node.id === 'root' ? 'root-node' : ''}`;
    el.style.left = (node.x * currentZoom) + 'px';
    el.style.top = (node.y * currentZoom) + 'px';

    const isRoot = node.id === 'root';

    // 头部
    const header = document.createElement('div');
    header.className = 'node-header';
    header.innerHTML = `
        <input class="node-name" value="${isRoot ? '{ JSON Root }' : node.name}"
               ${isRoot ? 'readonly' : ''}
               oninput="updateNodeName('${node.id}', this.value)">
        ${!isRoot ? `<button class="btn-del" onclick="deleteNode('${parentId}', '${node.id}')">×</button>` : ''}
    `;
    el.appendChild(header);

    // 键值对行
    node.fields.forEach((f) => {
        const row = document.createElement('div');
        row.className = 'field-row';
        row.innerHTML = `
            <input class="key-input" value="${f.key}" oninput="updateField('${node.id}', '${f.id}', 'key', this.value)">
            <span>:</span>
            <input class="val-input" value="${f.value}" oninput="updateField('${node.id}', '${f.id}', 'value', this.value)">
            <button class="btn-del" onclick="deleteField('${node.id}', '${f.id}')">×</button>
        `;
        el.appendChild(row);
    });

    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
        <button class="btn-sm" onclick="addField('${node.id}')">+ Key</button>
        <button class="btn-sm" onclick="addChild('${node.id}', 'object')">+ Obj</button>
        <button class="btn-sm" onclick="addChild('${node.id}', 'array')">+ Arr</button>
    `;
    el.appendChild(actions);

    nodesLayer.appendChild(el);

    // 递归子节点
    node.children.forEach((child) => {
        renderNode(child, node.id);
        // 连线
        drawLine(
            (node.x + 260) * currentZoom,
            (node.y + 40) * currentZoom,
            child.x * currentZoom,
            (child.y + 40) * currentZoom
        );
    });
}

// 查找节点
function findNode(root, id) {
    if (root.id === id) return root;
    if (root.children) {
        for (let child of root.children) {
            let found = findNode(child, id);
            if (found) return found;
        }
    }
    return null;
}

// 增删改函数 (通过 window 暴露)
window.updateNodeName = (id, val) => { const n = findNode(treeData, id); if(n) n.name = val; syncJSON(); };
window.updateField = (id, fId, type, val) => {
    const n = findNode(treeData, id);
    const f = n.fields.find(item => item.id === fId);
    if(f) f[type] = val;
    syncJSON();
};
window.addField = (id) => {
    const n = findNode(treeData, id);
    n.fields.push({ id: Date.now().toString(), key: "key", value: "val" });
    render();
};
window.deleteField = (nId, fId) => {
    const n = findNode(treeData, nId);
    n.fields = n.fields.filter(f => f.id !== fId);
    render();
};
window.addChild = (id, type) => {
    const p = findNode(treeData, id);
    const newNode = {
        id: "n" + Date.now(),
        name: type,
        type: type,
        x: p.x + 300,
        y: p.y + (p.children.length * 150),
        fields: [{ id: "f"+Date.now(), key: "key", value: "val" }],
        children: []
    };
    p.children.push(newNode);
    render();
};
window.deleteNode = (pId, cId) => {
    const p = findNode(treeData, pId);
    p.children = p.children.filter(c => c.id !== cId);
    render();
};

function drawLine(x1, y1, x2, y2) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const cp1 = x1 + (50 * currentZoom);
    const cp2 = x2 - (50 * currentZoom);
    path.setAttribute('d', `M ${x1} ${y1} C ${cp1} ${y1}, ${cp2} ${y2}, ${x2} ${y2}`);
    path.setAttribute('stroke', '#adb5bd');
    path.setAttribute('fill', 'transparent');
    path.setAttribute('stroke-width', 2 * currentZoom);
    svgLayer.appendChild(path);
}

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

function syncJSON() {
    const finalData = buildJSON(treeData);
    const jsonText = JSON.stringify(finalData, null, 4);
    jsonPreview.innerText = jsonText;

    // 生成行号
    const lines = jsonText.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('<br>');

    // 自适应行号宽度（根据数字位数计算）
    const maxLineNumber = lines.length;
    const digitWidth = 9; // 每位数字的宽度
    const paddingWidth = 20; // 左右内边距
    const lineNumberWidth = (maxLineNumber.toString().length * digitWidth) + paddingWidth;
    lineNumbers.style.width = lineNumberWidth + 'px';
    lineNumbers.style.minWidth = 'auto';
}

// 动态调整画布大小
function resizeCanvas() {
    const container = canvasContainer;
    const maxRight = Math.max(...getAllNodes().map(n => (n.x + 260) * currentZoom));
    const maxBottom = Math.max(...getAllNodes().map(n => (n.y + getNodeHeight(n)) * currentZoom));

    const neededWidth = Math.max(container.clientWidth, maxRight + 100);
    const neededHeight = Math.max(container.clientHeight, maxBottom + 100);

    svgLayer.style.width = neededWidth + 'px';
    svgLayer.style.height = neededHeight + 'px';
    svgLayer.style.minWidth = neededWidth + 'px';
    svgLayer.style.minHeight = neededHeight + 'px';
    nodesLayer.style.width = neededWidth + 'px';
    nodesLayer.style.height = neededHeight + 'px';
}

// 应用变换（平移）
function applyTransform() {
    // 只使用平移，不使用scale
    canvasContent.style.transform = `translate3d(${panX}px, ${panY}px, 0)`;
    updateZoomInfo();
}

// 更新缩放相关的CSS样式
function updateZoomStyles() {
    const root = document.documentElement;
    root.style.setProperty('--zoom-factor', currentZoom);
    root.style.setProperty('--node-width', (260 * currentZoom) + 'px');
    root.style.setProperty('--font-size-base', (12 * currentZoom) + 'px');
    root.style.setProperty('--font-size-sm', (11 * currentZoom) + 'px');
    root.style.setProperty('--font-size-lg', (14 * currentZoom) + 'px');
    root.style.setProperty('--padding-base', (10 * currentZoom) + 'px');
    root.style.setProperty('--padding-sm', (8 * currentZoom) + 'px');
    root.style.setProperty('--padding-xs', (3 * currentZoom) + 'px');
    root.style.setProperty('--border-radius', (8 * currentZoom) + 'px');
    root.style.setProperty('--border-radius-sm', (4 * currentZoom) + 'px');
    root.style.setProperty('--gap', (5 * currentZoom) + 'px');
    root.style.setProperty('--stroke-width', (2 * currentZoom) + 'px');
    root.style.setProperty('--header-height', (40 * currentZoom) + 'px');
    root.style.setProperty('--field-height', (35 * currentZoom) + 'px');
    root.style.setProperty('--actions-height', (45 * currentZoom) + 'px');
    root.style.setProperty('--input-height-key', (80 * currentZoom) + 'px');
    root.style.setProperty('--input-height-val', (100 * currentZoom) + 'px');
    root.style.setProperty('--input-height-name', (140 * currentZoom) + 'px');
    const shadowBlur = 24 * currentZoom;
    const shadowY = 12 * currentZoom;
    const shadowX = 4 * currentZoom;
    root.style.setProperty('--shadow', `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.1)`);
}

// 更新缩放相关的CSS样式
function updateZoomStyles() {
    const root = document.documentElement;
    root.style.setProperty('--zoom-factor', currentZoom);
    root.style.setProperty('--node-width', (260 * currentZoom) + 'px');
    root.style.setProperty('--font-size-base', (12 * currentZoom) + 'px');
    root.style.setProperty('--font-size-sm', (11 * currentZoom) + 'px');
    root.style.setProperty('--font-size-lg', (14 * currentZoom) + 'px');
    root.style.setProperty('--padding-base', (10 * currentZoom) + 'px');
    root.style.setProperty('--padding-sm', (8 * currentZoom) + 'px');
    root.style.setProperty('--padding-xs', (3 * currentZoom) + 'px');
    root.style.setProperty('--border-radius', (8 * currentZoom) + 'px');
    root.style.setProperty('--border-radius-sm', (4 * currentZoom) + 'px');
    root.style.setProperty('--gap', (5 * currentZoom) + 'px');
    root.style.setProperty('--stroke-width', (2 * currentZoom) + 'px');
    root.style.setProperty('--header-height', (40 * currentZoom) + 'px');
    root.style.setProperty('--field-height', (35 * currentZoom) + 'px');
    root.style.setProperty('--actions-height', (45 * currentZoom) + 'px');
    root.style.setProperty('--input-height-key', (80 * currentZoom) + 'px');
    root.style.setProperty('--input-height-val', (100 * currentZoom) + 'px');
    root.style.setProperty('--input-height-name', (140 * currentZoom) + 'px');
    root.style.setProperty('--shadow', `${4 * currentZoom}px ${12 * currentZoom}px ${24 * currentZoom}px rgba(0, 0, 0, 0.1)`);
}

// 更新缩放信息
function updateZoomInfo() {
    const zoomInfo = document.getElementById('zoom-info');
    if (zoomInfo) {
        zoomInfo.innerText = `缩放: ${Math.round(currentZoom * 100)}% | Ctrl+滚轮: 缩放 | 拖动: 移动画布`;
    }
}

// 获取所有节点
function getAllNodes(node = treeData) {
    let nodes = [node];
    node.children.forEach(child => {
        nodes = nodes.concat(getAllNodes(child));
    });
    return nodes;
}

// 计算节点高度
function getNodeHeight(node) {
    const headerHeight = 40 * currentZoom;
    const fieldHeight = 35 * currentZoom;
    const actionsHeight = 45 * currentZoom;
    return headerHeight + (node.fields.length * fieldHeight) + actionsHeight;
}

// 初始渲染
updateZoomStyles();
render();
applyTransform();

// 监听窗口大小变化
window.addEventListener('resize', () => {
    resizeCanvas();
    applyTransform();
});

// 同步 JSON 源码区和行号的滚动
jsonPreview.addEventListener('scroll', () => {
    lineNumbers.scrollTop = jsonPreview.scrollTop;
});

// 复制JSON功能
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

// 禁用右键菜单
canvasContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// 禁用侧边栏右键菜单
sidebar.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// 手掌拖动功能
canvasContainer.addEventListener('mousedown', (e) => {
    // 如果点击的是节点内部的输入框或按钮，不触发拖动
    if (e.target.closest('.node') || e.target.closest('input') || e.target.closest('button')) {
        return;
    }

    // 只允许左键拖动
    if (e.button !== 0) {
        return;
    }

    isDragging = true;
    canvasContainer.classList.add('panning');
    startX = e.clientX;
    startY = e.clientY;

    // 防止选中文字
    e.preventDefault();
});

canvasContainer.addEventListener('mouseleave', () => {
    isDragging = false;
    canvasContainer.classList.remove('panning');
});

canvasContainer.addEventListener('mouseup', () => {
    isDragging = false;
    canvasContainer.classList.remove('panning');
});

canvasContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    e.preventDefault();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    panX += dx;
    panY += dy;

    startX = e.clientX;
    startY = e.clientY;

    applyTransform();
});

// 鼠标滚轮缩放功能
canvasContainer.addEventListener('wheel', (e) => {
    e.preventDefault();

    // 如果按住Ctrl键，则是缩放
    if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        const newZoom = Math.min(Math.max(currentZoom + delta, minZoom), maxZoom);

        if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            updateZoomStyles();
            render();
            resizeCanvas();
            applyTransform();
        }
    }
    // 否则是平移
    else {
        panX -= e.deltaX;
        panY -= e.deltaY;
        applyTransform();
    }
}, { passive: false });