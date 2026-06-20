// ===== 标签页管理 =====

var MAX_TABS = 10;
var tabs = [];
var activeTabIndex = 0;
var tabCounter = 0;

// 创建默认树数据
function createDefaultTreeData() {
    return {
        id: "root",
        name: "JSON Object",
        type: "object",
        x: 50, y: 50,
        fields: [
            { id: "f1", key: "key1", value: "val" },
        ],
        children: [],
        childNameCounters: { key: 1, object: 0, array: 0 }  // 子节点名称计数器，key已使用1个
    };
}

// 标签页状态类
class TabState {
    constructor(title) {
        tabCounter++;
        this.id = tabCounter;
        this.title = title || `标签 ${tabCounter}`;
        this.treeData = createDefaultTreeData();
        this.panX = 0;
        this.panY = 0;
        this.currentZoom = 1;
        this.sidebarWidth = 400;
    }
}

// 获取当前活跃标签
function getActiveTab() {
    return tabs[activeTabIndex];
}

// ===== 名称生成辅助函数 =====

// 生成字段名称（基于父节点计数，扫描现有节点确保连续性）
function generateFieldName(parentNode, type) {
    if (!parentNode.childNameCounters) {
        parentNode.childNameCounters = { key: 0, object: 0, array: 0 };
    }
    
    let maxNum = 0;
    
    if (type === 'key') {
        // 扫描所有fields，找到key后面的最大数字
        if (parentNode.fields) {
            parentNode.fields.forEach(f => {
                const match = f.key.match(/^key(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            });
        }
    } else if (type === 'object' || type === 'array') {
        // 扫描所有children，找到对应类型的最大数字
        if (parentNode.children) {
            parentNode.children.forEach(child => {
                if (child.type === type) {
                    const match = child.name.match(new RegExp('^' + type + '(\\d+)$'));
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > maxNum) maxNum = num;
                    }
                }
            });
        }
    }
    
    const newNum = maxNum + 1;
    
    // 更新计数器（用于导入JSON时的初始值）
    if (newNum > parentNode.childNameCounters[type]) {
        parentNode.childNameCounters[type] = newNum;
    }
    
    return type + newNum;
}

// 渲染标签栏
function renderTabBar() {
    var tabList = document.getElementById('tab-list');
    var addBtn = document.getElementById('tab-add-btn');
    
    // 只移除标签项，保留添加按钮
    var tabItems = tabList.querySelectorAll('.tab-item');
    tabItems.forEach(function(item) {
        item.remove();
    });

    tabs.forEach(function(tab, index) {
        var tabItem = document.createElement('div');
        tabItem.className = 'tab-item' + (index === activeTabIndex ? ' active' : '');
        tabItem.addEventListener('click', function(e) {
            if (e.target.closest('.tab-close')) return;
            switchTab(index);
        });

        var title = document.createElement('span');
        title.className = 'tab-title';
        title.textContent = tab.title;

        var closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeTab(index);
        });

        tabItem.appendChild(title);
        tabItem.appendChild(closeBtn);
        // 在添加按钮之前插入标签项
        tabList.insertBefore(tabItem, addBtn);
    });

    addBtn.disabled = tabs.length >= MAX_TABS;
}

// 新建标签页
function addTab() {
    if (tabs.length >= MAX_TABS) return;

    saveCurrentTabState();

    var newTab = new TabState();
    tabs.push(newTab);
    activeTabIndex = tabs.length - 1;

    renderTabBar();
    restoreActiveTabState();
    render();
}

// 关闭标签页
function closeTab(index) {
    if (tabs.length <= 1) {
        tabs.length = 0;
        tabCounter = 0;
        var newTab = new TabState('标签 1');
        tabs.push(newTab);
        activeTabIndex = 0;
        renderTabBar();
        restoreActiveTabState();
        render();
        return;
    }

    var wasActive = index === activeTabIndex;

    tabs.splice(index, 1);

    if (wasActive) {
        if (activeTabIndex >= tabs.length) {
            activeTabIndex = tabs.length - 1;
        }
        renderTabBar();
        restoreActiveTabState();
        render();
    } else {
        if (index < activeTabIndex) {
            activeTabIndex--;
        }
        renderTabBar();
    }
}

// 切换标签页
function switchTab(index) {
    if (index === activeTabIndex) return;

    saveCurrentTabState();

    activeTabIndex = index;

    renderTabBar();
    restoreActiveTabState();
    render();
}

// 保存当前标签的状态
function saveCurrentTabState() {
    var tab = tabs[activeTabIndex];
    if (!tab) return;
    tab.panX = panX;
    tab.panY = panY;
    tab.currentZoom = currentZoom;
    tab.sidebarWidth = parseInt(sidebar.style.width) || 400;
}

// 恢复当前活跃标签的状态
function restoreActiveTabState() {
    var tab = getActiveTab();
    if (!tab) return;
    panX = tab.panX;
    panY = tab.panY;
    currentZoom = tab.currentZoom;
    sidebar.style.width = (tab.sidebarWidth || 400) + 'px';
    isDragging = false;
    updateZoomStyles();
    applyTransform();
}

// 绑定新建按钮
document.getElementById('tab-add-btn').addEventListener('click', addTab);