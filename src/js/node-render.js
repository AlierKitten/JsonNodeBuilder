// ===== 节点渲染与操作 =====

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

// 绘制连线
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

// 渲染节点
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
        ${!isRoot ? `<button class="btn-del" onclick="deleteNode('${parentId}', '${node.id}')"></button>` : ''}
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
            <button class="btn-del" onclick="deleteField('${node.id}', '${f.id}')"></button>
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
        drawLine(
            (node.x + 260) * currentZoom,
            (node.y + 40) * currentZoom,
            child.x * currentZoom,
            (child.y + 40) * currentZoom
        );
    });
}

// 渲染入口
function render() {
    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';
    renderNode(treeData, null);
    syncJSON();
    resizeCanvas();
}

// 增删改操作（通过 window 暴露给 HTML onclick）
window.updateNodeName = (id, val) => { const n = findNode(treeData, id); if (n) n.name = val; syncJSON(); };
window.updateField = (id, fId, type, val) => {
    const n = findNode(treeData, id);
    const f = n.fields.find(item => item.id === fId);
    if (f) f[type] = val;
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
        fields: [{ id: "f" + Date.now(), key: "key", value: "val" }],
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
