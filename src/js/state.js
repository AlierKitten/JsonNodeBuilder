// ===== 全局状态与数据 =====

// treeData 现在由标签页管理，通过 getActiveTab().treeData 访问

// DOM 引用
const nodesLayer = document.getElementById('nodes-layer');
const svgLayer = document.getElementById('lines-svg');
const jsonPreview = document.getElementById('json-preview');
const lineNumbers = document.getElementById('line-numbers');
const canvasContainer = document.getElementById('canvas-container');
const canvasContent = document.getElementById('canvas-content');
const sidebar = document.getElementById('sidebar');

// 拖动相关变量（全局，切换标签时恢复/保存）
var isDragging = false;
var startX, startY;
var panX = 0, panY = 0;

// 缩放相关变量（全局，切换标签时恢复/保存）
var currentZoom = 1;
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;
