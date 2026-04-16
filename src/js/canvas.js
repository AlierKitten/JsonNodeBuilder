// ===== 画布：平移、缩放、变换 =====

// 应用变换（平移）
function applyTransform() {
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
});
