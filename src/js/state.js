// ===== 全局状态与数据 =====

// 树形数据
const treeData = {
    id: "root",
    name: "JSON Object",
    type: "object",
    x: 50, y: 50,
    fields: [
        { id: "f1", key: "id", value: "1" },
    ],
    children: []
};

// DOM 引用
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
