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

// 查找父节点
function findParent(root, childId) {
    if (!root.children) return null;
    for (let child of root.children) {
        if (child.id === childId) return root;
        const found = findParent(child, childId);
        if (found) return found;
    }
    return null;
}

// 获取所有节点（接受 treeData 参数）
function getAllNodes(node) {
    node = node || getActiveTab().treeData;
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

// 重新计算子节点的位置
function relayoutChildren(parent) {
    let yOffset = parent.y;
    parent.children.forEach((child, index) => {
        if (index > 0) {
            const prevSibling = parent.children[index - 1];
            yOffset += getNodeHeight(prevSibling) + 30; // 30px的间距
        }
        child.y = yOffset;
        // 递归处理子节点的子节点
        if (child.children.length > 0) {
            relayoutChildren(child);
        }
    });
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

// 动态调整输入框宽度以适应内容
function autoResizeInput(input) {
    // 创建临时span来测量文本宽度
    const temp = document.createElement('span');
    temp.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-size: ${getComputedStyle(input).fontSize};
        font-family: ${getComputedStyle(input).fontFamily};
        font-weight: ${getComputedStyle(input).fontWeight};
        padding: ${getComputedStyle(input).padding};
    `;
    temp.textContent = input.value || input.placeholder || '';
    document.body.appendChild(temp);
    
    const textWidth = temp.offsetWidth;
    document.body.removeChild(temp);
    
    // 设置输入框宽度：文本宽度 + padding，保留最小100px
    const minWidth = 100;
    const padding = 12; // 左右padding
    const newWidth = Math.max(textWidth + padding, minWidth);
    
    // 禁用 field-sizing，确保 JavaScript 控制宽度
    input.style.fieldSizing = 'fixed';
    input.style.width = newWidth + 'px';
    
    return newWidth;
}

// 同步同一行中 key 和 value 输入框的宽度
function syncKeyValueWidths() {
    document.querySelectorAll('.field-row').forEach(row => {
        const keyInput = row.querySelector('.key-input');
        const valInput = row.querySelector('.val-input');
        
        if (keyInput && valInput) {
            // 创建一个隐藏的 span 来测量两者的文本宽度
            const keyText = keyInput.value || keyInput.placeholder || '';
            const valText = valInput.value || valInput.placeholder || '';
            
            const getTextWidth = (text, input) => {
                const temp = document.createElement('span');
                temp.style.cssText = `
                    position: absolute;
                    visibility: hidden;
                    white-space: nowrap;
                    font-size: ${getComputedStyle(input).fontSize};
                    font-family: ${getComputedStyle(input).fontFamily};
                    font-weight: ${getComputedStyle(input).fontWeight};
                    padding: ${getComputedStyle(input).padding};
                `;
                temp.textContent = text;
                document.body.appendChild(temp);
                const width = temp.offsetWidth;
                document.body.removeChild(temp);
                return width;
            };
            
            const keyWidth = getTextWidth(keyText, keyInput);
            const valWidth = getTextWidth(valText, valInput);
            
            const minWidth = 100;
            const padding = 12;
            const maxWidth = Math.max(keyWidth, valWidth, minWidth) + padding;
            
            keyInput.style.fieldSizing = 'fixed';
            valInput.style.fieldSizing = 'fixed';
            keyInput.style.width = maxWidth + 'px';
            valInput.style.width = maxWidth + 'px';
        }
    });
}

// 渲染节点（第一遍：创建DOM）
function renderNode(node, parentId) {
    const el = document.createElement('div');
    el.className = `node ${node.id === 'root' ? 'root-node' : ''}`;
    el.style.left = (node.x * currentZoom) + 'px';
    el.style.top = (node.y * currentZoom) + 'px';
    el.dataset.nodeId = node.id;

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
        const isArray = node.type === 'array';
        const keyReadonlyAttr = isArray ? 'readonly' : '';
        const keyDisabledClass = isArray ? 'array-key' : '';
        row.innerHTML = `
            <input class="key-input ${keyDisabledClass}" value="${f.key}" ${keyReadonlyAttr} oninput="updateField('${node.id}', '${f.id}', 'key', this.value, this)">
            <span>:</span>
            <input class="val-input" value="${f.value}" oninput="updateField('${node.id}', '${f.id}', 'value', this.value, this)">
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
    });
}

// 调整子节点位置（第二遍：基于实际渲染宽度）
function repositionChildren(node) {
    const el = nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
    if (!el) return;
    
    const actualWidth = el.offsetWidth / currentZoom;
    node.actualWidth = actualWidth;
    
    // 调整直接子节点的x位置，然后递归处理
    node.children.forEach((child) => {
        child.x = node.x + actualWidth + 40;
        repositionChildren(child);
    });
}

// 更新所有节点DOM元素的位置
function updateAllNodePositions(node) {
    const el = nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
    if (el) {
        el.style.left = (node.x * currentZoom) + 'px';
        el.style.top = (node.y * currentZoom) + 'px';
    }
    node.children.forEach(child => {
        updateAllNodePositions(child);
    });
}

// 绘制所有连线（第三遍）
function drawAllLines(node) {
    const parentEl = nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
    if (!parentEl) return;

    const parentWidth = node.actualWidth || parentEl.offsetWidth / currentZoom;

    node.children.forEach((child) => {
        drawLine(
            (node.x + parentWidth) * currentZoom,
            (node.y + 40) * currentZoom,
            child.x * currentZoom,
            (child.y + 40) * currentZoom
        );
        drawAllLines(child);
    });
}

// 重新定位节点及其所有祖先的子节点，并更新所有连线
function repositionAndUpdateLines(node) {
    // 找到根节点
    const tab = getActiveTab();
    let root = tab.treeData;
    
    // 更新所有节点的子节点位置（从根开始）
    repositionChildren(root);
    
    // 更新所有节点DOM元素的位置
    updateAllNodePositions(root);
    
    // 更新所有连线
    svgLayer.innerHTML = '';
    drawAllLines(root);
    
    // 同步JSON
    syncJSON();
}

// 重新渲染并调整所有输入框宽度
function renderWithInputResize() {
    const tab = getActiveTab();
    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';
    
    // 第一遍：渲染所有节点
    renderNode(tab.treeData, null);
    
    // 第二遍：自动调整所有输入框宽度，同行 key/value 同步
    syncKeyValueWidths();
    
    // 第三遍：获取实际宽度并调整子节点位置（延迟到下一个动画帧，确保输入框宽度已更新）
    requestAnimationFrame(() => {
        repositionChildren(tab.treeData);
        
        // 第四遍：绘制连线
        drawAllLines(tab.treeData);
        
        syncJSON();
        resizeCanvas();
    });
}

// 渲染入口
function render() {
    const tab = getActiveTab();
    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';
    
    // 第一遍：渲染所有节点
    renderNode(tab.treeData, null);
    
    // 第二遍：获取实际宽度并调整子节点位置
    repositionChildren(tab.treeData);
    
    // 第三遍：绘制连线
    drawAllLines(tab.treeData);
    
    // 第四遍：自动调整所有输入框宽度，同行 key/value 同步
    syncKeyValueWidths();
    
    syncJSON();
    resizeCanvas();
}

// 增删改操作（通过 window 暴露给 HTML onclick）
window.updateNodeName = (id, val) => {
    const tab = getActiveTab();
    const n = findNode(tab.treeData, id);
    if (n) n.name = val;
    // 延迟执行，等待布局完成
    requestAnimationFrame(() => {
        repositionAndUpdateLines(n);
    });
};
// 实时同步同行 key/value 宽度
function syncRowWidths(inputEl) {
    const row = inputEl.closest('.field-row');
    if (!row) return;
    
    const keyInput = row.querySelector('.key-input');
    const valInput = row.querySelector('.val-input');
    if (!keyInput || !valInput) return;
    
    const keyText = keyInput.value || keyInput.placeholder || '';
    const valText = valInput.value || valInput.placeholder || '';
    
    const getTextWidth = (text, input) => {
        const temp = document.createElement('span');
        temp.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: nowrap;
            font-size: ${getComputedStyle(input).fontSize};
            font-family: ${getComputedStyle(input).fontFamily};
            font-weight: ${getComputedStyle(input).fontWeight};
            padding: ${getComputedStyle(input).padding};
        `;
        temp.textContent = text;
        document.body.appendChild(temp);
        const width = temp.offsetWidth;
        document.body.removeChild(temp);
        return width;
    };
    
    const keyWidth = getTextWidth(keyText, keyInput);
    const valWidth = getTextWidth(valText, valInput);
    
    const minWidth = 100;
    const padding = 12;
    const maxWidth = Math.max(keyWidth, valWidth, minWidth) + padding;
    
    keyInput.style.fieldSizing = 'fixed';
    valInput.style.fieldSizing = 'fixed';
    keyInput.style.width = maxWidth + 'px';
    valInput.style.width = maxWidth + 'px';
}

window.updateField = (id, fId, type, val, inputEl) => {
    const tab = getActiveTab();
    const n = findNode(tab.treeData, id);
    const f = n.fields.find(item => item.id === fId);
    if (f) f[type] = val;
    
    // 实时同步同行宽度（同步执行，立即响应）
    syncRowWidths(inputEl);
    
    // 延迟更新节点位置和连线
    requestAnimationFrame(() => {
        repositionAndUpdateLines(n);
    });
};

window.addField = (id) => {
    const tab = getActiveTab();
    const n = findNode(tab.treeData, id);
    // 使用基于父节点计数的唯一key名称
    const newKeyName = generateFieldName(n, 'key');
    n.fields.push({ id: Date.now().toString(), key: newKeyName, value: "val" });
    // 添加字段后重新布局子节点
    if (n.children.length > 0) {
        relayoutChildren(n);
    }
    // 重新布局当前节点的兄弟节点（找到父节点并重新布局）
    const parent = findParent(tab.treeData, id);
    if (parent) {
        relayoutChildren(parent);
    }
    render();
};
window.deleteField = (nId, fId) => {
    const tab = getActiveTab();
    const n = findNode(tab.treeData, nId);
    n.fields = n.fields.filter(f => f.id !== fId);
    // 删除字段后重新布局子节点
    if (n.children.length > 0) {
        relayoutChildren(n);
    }
    // 重新布局当前节点的兄弟节点（找到父节点并重新布局）
    const parent = findParent(tab.treeData, nId);
    if (parent) {
        relayoutChildren(parent);
    }
    render();
};
window.addChild = (id, type) => {
    const tab = getActiveTab();
    const p = findNode(tab.treeData, id);
    // 使用基于父节点计数的名称
    const newNodeName = generateFieldName(p, type);
    // 先获取父节点当前的实际宽度（如果有的话）
    const parentEl = nodesLayer.querySelector(`[data-node-id="${id}"]`);
    const parentWidth = parentEl ? parentEl.offsetWidth / currentZoom : (p.actualWidth || 260);
    
    const newNode = {
        id: "n" + Date.now(),
        name: newNodeName,
        type: type,
        x: p.x + parentWidth + 40, // 根据父节点实际宽度 + 间距
        y: p.y,
        fields: [],
        children: [],
        childNameCounters: { key: 0, object: 0, array: 0 }
    };
    // 添加默认字段
    const defaultKeyName = generateFieldName(newNode, 'key');
    newNode.fields.push({ id: "f" + Date.now(), key: defaultKeyName, value: "val" });
    
    p.children.push(newNode);
    relayoutChildren(p);
    render();
};
window.deleteNode = (pId, cId) => {
    const tab = getActiveTab();
    const p = findNode(tab.treeData, pId);
    p.children = p.children.filter(c => c.id !== cId);
    // 删除节点后重新布局子节点
    relayoutChildren(p);
    render();
};
