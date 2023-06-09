# Shader Graph WGSL

一个 Unity `Shader Graph` 高仿 `WGSL` 特供版

## Demo

[在线体验](https://deepkolos.github.io/shader-graph-wgsl/)

<div style="display: grid; grid: repeat(2, 180px) / auto-flow 290px;">
  <img width="280" alt="fresnelOutline" src="./screenshots/fresnelOutline.png">
  <img width="280" alt="dissolve" src="./screenshots/dissolve.png">
  <img width="280" alt="procedural" src="./screenshots/procedural.png">
  <img width="280" alt="subgraph" src="./screenshots/subgraph.png"> 
  <img width="280" alt="subgraph" src="./screenshots/previewNumber.png"> 
  <img width="280" alt="subgraph" src="./screenshots/flowmap.png"> 
</div>

## TODO

- 增加 视频内 Demo https://www.bilibili.com/video/BV1GB4y1y7FT
- 增加 [PreviewNumber 节点](https://deepkolos.github.io/shader-graph-wgsl/?graph=devUtility) ✅
- 增加 [FlowMap Demo](https://deepkolos.github.io/shader-graph-wgsl/?graph=demoFlowMap) ✅
- 修复内存泄漏 ✅
- 迁移 https://juejin.cn/post/7160463663504031781 文中特效到shader graph
  - [demoImageFlip](https://deepkolos.github.io/shader-graph-wgsl/?graph=demoImageFlip) ✅
- 完善 Lit template
- 编辑操作
  - 缩放限制 ✅
  - minimap
  - 全貌
  - 自动对齐
  - 多选 ✅
  - 背景拖拽 ✅
    - no alt 框选 ✅
    - alt 整体拖拽 ✅
  - 复制粘贴剪切[单/多] ✅ 快捷键控制(TBD)
  - 单点链接未完成弹出新增节点菜单,选择后并链接 ✅
  - 新增节点弹窗增加键盘控制[enter/上下] (TBD)

# 赞助

如果项目对您有帮助，欢迎打赏

<img src="https://upload-images.jianshu.io/upload_images/252050-d3d6bfdb1bb06ddd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240" alt="赞赏码" width="300">

感谢各位支持~~
# License

MIT 仅供学习交流使用