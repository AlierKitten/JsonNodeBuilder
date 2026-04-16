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
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';

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
        drawLine(node.x + 260, node.y + 40, child.x, child.y + 40);
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
    const cp1 = x1 + 50; const cp2 = x2 - 50;
    path.setAttribute('d', `M ${x1} ${y1} C ${cp1} ${y1}, ${cp2} ${y2}, ${x2} ${y2}`);
    path.setAttribute('stroke', '#adb5bd');
    path.setAttribute('fill', 'transparent');
    path.setAttribute('stroke-width', '2');
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
}

// 动态调整画布大小
function resizeCanvas() {
    const container = canvasContainer;
    const maxRight = Math.max(...getAllNodes().map(n => n.x + 260));
    const maxBottom = Math.max(...getAllNodes().map(n => n.y + getNodeHeight(n)));

    const neededWidth = Math.max(container.clientWidth, maxRight + 100);
    const neededHeight = Math.max(container.clientHeight, maxBottom + 100);

    svgLayer.style.width = neededWidth + 'px';
    svgLayer.style.height = neededHeight + 'px';
    svgLayer.style.minWidth = neededWidth + 'px';
    svgLayer.style.minHeight = neededHeight + 'px';
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
    const headerHeight = 40;
    const fieldHeight = 35;
    const actionsHeight = 45;
    return headerHeight + (node.fields.length * fieldHeight) + actionsHeight;
}

// 初始渲染
render();
resizeCanvas();

// 监听窗口大小变化
window.addEventListener('resize', resizeCanvas);

// 监听画布滚动
canvasContainer.addEventListener('scroll', () => {
    // 可以在这里添加额外的逻辑，比如同步滚动
});

// 同步 JSON 源码区和行号的滚动
jsonPreview.addEventListener('scroll', () => {
    lineNumbers.scrollTop = jsonPreview.scrollTop;
});