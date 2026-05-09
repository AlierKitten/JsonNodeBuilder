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
            { id: "f1", key: "id", value: "1" },
        ],
        children: []
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
    }
}

// 获取当前活跃标签
function getActiveTab() {
    return tabs[activeTabIndex];
}

// 渲染标签栏
function renderTabBar() {
    var tabList = document.getElementById('tab-list');
    var addBtn = document.getElementById('tab-add-btn');
    tabList.innerHTML = '';

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
        tabList.appendChild(tabItem);
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
}

// 恢复当前活跃标签的状态
function restoreActiveTabState() {
    var tab = getActiveTab();
    if (!tab) return;
    panX = tab.panX;
    panY = tab.panY;
    currentZoom = tab.currentZoom;
    isDragging = false;
    updateZoomStyles();
    applyTransform();
}

// 绑定新建按钮
document.getElementById('tab-add-btn').addEventListener('click', addTab);
