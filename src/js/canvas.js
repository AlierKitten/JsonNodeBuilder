// ===== 画布：平移、缩放、变换 =====

// 应用变换（平移）
function applyTransform() {
    canvasContent.style.transform = `translate3d(${panX}px, ${panY}px, 0)`;
    updateZoomInfo();
    renderMinimap();
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

// 动态调整画布大小
function resizeCanvas() {
    const container = canvasContainer;
    const tab = getActiveTab();
    const maxRight = Math.max(...getAllNodes(tab.treeData).map(n => (n.x + 260) * currentZoom));
    const maxBottom = Math.max(...getAllNodes(tab.treeData).map(n => (n.y + getNodeHeight(n)) * currentZoom));

    const neededWidth = Math.max(container.clientWidth, maxRight + 100);
    const neededHeight = Math.max(container.clientHeight, maxBottom + 100);

    svgLayer.style.width = neededWidth + 'px';
    svgLayer.style.height = neededHeight + 'px';
    svgLayer.style.minWidth = neededWidth + 'px';
    svgLayer.style.minHeight = neededHeight + 'px';
    nodesLayer.style.width = neededWidth + 'px';
    nodesLayer.style.height = neededHeight + 'px';
}

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
    if (e.target.closest('.node') || e.target.closest('input') || e.target.closest('button')) {
        return;
    }
    if (e.button !== 0) {
        return;
    }
    isDragging = true;
    canvasContainer.classList.add('panning');
    startX = e.clientX;
    startY = e.clientY;
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
    if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        const newZoom = Math.min(Math.max(currentZoom + delta, minZoom), maxZoom);
        if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            // 同步到当前标签
            const tab = getActiveTab();
            if (tab) tab.currentZoom = currentZoom;
            updateZoomStyles();
            render();
            resizeCanvas();
            applyTransform();
        }
    } else {
        panX -= e.deltaX;
        panY -= e.deltaY;
        applyTransform();
    }
}, { passive: false });

// 监听窗口大小变化
window.addEventListener('resize', () => {
    resizeCanvas();
    applyTransform();
    renderMinimap();
});

// ===== 鸟瞰图（Minimap） =====

const minimap = document.getElementById('minimap');
const minimapSvg = document.getElementById('minimap-svg');

// 根据节点世界坐标计算鸟瞰图
function renderMinimap() {
    const tab = getActiveTab();
    if (!tab || !minimapSvg) return;

    const nodes = getAllNodes(tab.treeData);
    if (nodes.length === 0) {
        minimapSvg.innerHTML = '';
        return;
    }

    // 1. 计算所有节点的世界坐标包围盒（不含缩放）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const nodeBounds = nodes.map(n => {
        const w = n.actualWidth || 260;
        const h = getNodeHeight(n) / currentZoom;
        const x = n.x, y = n.y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
        return { x, y, w, h };
    });

    // 预留边距，避免节点贴边
    const margin = 40;
    minX -= margin; minY -= margin;
    maxX += margin; maxY += margin;
    const worldW = (maxX - minX) || 1;
    const worldH = (maxY - minY) || 1;

    // 2. 计算缩放比例，使整个图适配鸟瞰图
    const rect = minimap.getBoundingClientRect();
    const pad = 8;
    const mw = rect.width - pad * 2;
    const mh = rect.height - pad * 2;
    const scale = Math.min(mw / worldW, mh / worldH) || 1;
    const offX = pad + (mw - worldW * scale) / 2;
    const offY = pad + (mh - worldH * scale) / 2;

    const toMx = wx => offX + (wx - minX) * scale;
    const toMy = wy => offY + (wy - minY) * scale;

    // 3. 绘制节点（抽象为圆角矩形）
    let svg = '';
    nodeBounds.forEach(b => {
        const rx = toMx(b.x);
        const ry = toMy(b.y);
        const rw = Math.max(b.w * scale, 2);
        const rh = Math.max(b.h * scale, 2);
        const r = Math.min(3, rw / 2, rh / 2);
        svg += `<rect class="mini-node" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" rx="${r.toFixed(1)}" ry="${r.toFixed(1)}"></rect>`;
    });

    // 4. 绘制当前视口框
    const vx = (0 - panX) / currentZoom;
    const vy = (0 - panY) / currentZoom;
    const vw = canvasContainer.clientWidth / currentZoom;
    const vh = canvasContainer.clientHeight / currentZoom;
    const vrx = toMx(vx);
    const vry = toMy(vy);
    const vrw = vw * scale;
    const vrh = vh * scale;
    svg += `<rect class="mini-viewport" x="${vrx.toFixed(1)}" y="${vry.toFixed(1)}" width="${vrw.toFixed(1)}" height="${vrh.toFixed(1)}" rx="2" ry="2"></rect>`;

    minimapSvg.innerHTML = svg;

    // 保存映射参数供点击导航使用
    minimapSvg._map = { minX, minY, scale, offX, offY, worldW, worldH, mw, mh, pad };
}

// 鸟瞰图点击/拖拽导航：将视口中心移动到对应世界坐标
function navigateFromMinimap(clientX, clientY) {
    const map = minimapSvg._map;
    if (!map) return;
    const rect = minimap.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    // 鸟瞰图像素 -> 世界坐标
    const worldX = map.minX + (mx - map.offX) / map.scale;
    const worldY = map.minY + (my - map.offY) / map.scale;

    // 使该世界点居中于画布
    panX = canvasContainer.clientWidth / 2 - worldX * currentZoom;
    panY = canvasContainer.clientHeight / 2 - worldY * currentZoom;
    applyTransform();
    renderMinimap();
}

let isMinimapDragging = false;

minimap.addEventListener('mousedown', (e) => {
    isMinimapDragging = true;
    navigateFromMinimap(e.clientX, e.clientY);
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (isMinimapDragging) {
        navigateFromMinimap(e.clientX, e.clientY);
    }
});

document.addEventListener('mouseup', () => {
    isMinimapDragging = false;
});

// ===== 分割条拖拽调整宽度 =====

let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('resizing');

    // 创建遮罩层，防止拖拽过程中鼠标移出窗口或经过iframe等元素时丢失事件
    const overlay = document.createElement('div');
    overlay.id = 'resizer-overlay';
    document.body.appendChild(overlay);

    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const workspaceRect = document.getElementById('workspace').getBoundingClientRect();
    const newSidebarWidth = workspaceRect.right - e.clientX;

    // 限制最小和最大宽度
    const minWidth = 250;
    const maxWidth = 800;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newSidebarWidth));

    sidebar.style.width = clampedWidth + 'px';
});

document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizer.classList.remove('resizing');

    // 将当前宽度保存到活跃标签页
    const tab = getActiveTab();
    if (tab) {
        tab.sidebarWidth = parseInt(sidebar.style.width) || 400;
    }

    // 移除遮罩层
    const overlay = document.getElementById('resizer-overlay');
    if (overlay) {
        overlay.remove();
    }
});