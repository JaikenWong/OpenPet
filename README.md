# OpenPet

Electron 开发的桌面宠物与 AI 聊天伴侣。

## 功能特性

- **透明桌宠**：无边框、可拖拽、始终置顶。
- **动画引擎**：基于原生 JS 轮播图片实现序列帧动画。
- **AI 对话**：左键点击宠物唤出聊天，直连本地 Hermes Agent。
- **全局快捷键**：
  - `Cmd/Ctrl+Shift+P`：显隐主窗口。
  - `Cmd/Ctrl+Shift+T`：切换始终置顶。

## 依赖环境

- Node.js
- Hermes Agent API (监听 `http://localhost:8642/v1/chat/completions`)

## 运行

```bash
npm install
npm start
```
