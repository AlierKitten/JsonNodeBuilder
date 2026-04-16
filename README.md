# Visual JSON Builder Pro

一个基于 Tauri + Vanilla JS 的可视化 JSON 构建器，支持节点式编辑和实时 JSON 生成。

## 功能特性

- 可视化节点编辑器
- 实时 JSON 预览
- 支持嵌套对象和数组
- 简洁的拖拽式交互

## 环境要求

- [Node.js](https://nodejs.org/) 18+ （用于 Tauri CLI）
- [Rust](https://www.rust-lang.org/) 1.70+ （Tauri 后端）
- [系统依赖](https://tauri.app/v1/guides/getting-started/prerequisites) （根据你的操作系统）

## 快速开始

### 1. 安装依赖

首先确保已安装 Rust 和 Node.js，然后安装 Tauri CLI：

```bash
npm install -g @tauri-apps/cli
```

### 2. 运行开发模式

```bash
npm run tauri dev
```

或者直接使用 Tauri CLI：

```bash
cargo tauri dev
```

### 3. 构建发布版本

```bash
npm run tauri build
```

构建产物会在 `src-tauri/target/release/bundle/` 目录下。

## 许可证

MIT License
