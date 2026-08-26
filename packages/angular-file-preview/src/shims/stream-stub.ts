// 浏览器环境下对 Node 内置 `stream` 模块的空实现
// 仅用于让 iconv-lite 的 `stream_module.Transform` 访问拿到 undefined,
// 从而跳过流式 API 启用,避免 Vite 的 "Module 'stream' has been externalized" 警告
export const Transform = undefined;
export const Readable = undefined;
export const Writable = undefined;
export const Duplex = undefined;
export const PassThrough = undefined;
export default {};
