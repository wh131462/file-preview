## 1. 高级图片 Worker

- [x] 1.1 将 React Image Renderer 接入 Worker 优先、主线程回退解码流程
- [x] 1.2 将 Vue Image Renderer 接入等价 Worker 优先、主线程回退解码流程
- [x] 1.3 增加 Worker 判定与回退路径的自动化测试

## 2. 公共 API 与文档

- [x] 2.1 从 React/Vue 根入口补齐请求与鉴权类型导出
- [x] 2.2 修复根中英文 README 的示例、命令、链接和能力说明
- [x] 2.3 同步 React/Vue 双语 README 的版本及 Worker/API 描述
- [x] 2.4 修复 VitePress 重复章节、版本标签、API 和高级图片说明

## 3. OpenSpec 收敛

- [x] 3.1 修订 bundle-optimization，删除 renderer 子路径、CSS 分包和过期 wawoff2 要求
- [x] 3.2 同步 README、React、Vue 与 VitePress 基准规范

## 4. 质量门禁

- [x] 4.1 增加 ESLint 9 flat config 并修复本次发现的 lint 问题
- [x] 4.2 增加根级测试脚本及公开导出、文件识别、请求工具、文档一致性测试
- [x] 4.3 运行 lint、test、库构建、文档构建、size-limit 和 OpenSpec 严格校验
