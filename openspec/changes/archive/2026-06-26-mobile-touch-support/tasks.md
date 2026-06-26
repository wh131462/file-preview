## 1. 准备工作

- [x] 1.1 阅读现有图片渲染器代码，理解当前鼠标事件处理逻辑
- [x] 1.2 确认 React 和 Vue 版本的事件绑定差异点
- [x] 1.3 在移动设备或模拟器上测试当前触屏体验

## 2. React 图片渲染器触屏支持

- [x] 2.1 添加触屏相关 state（触点信息、初始距离、初始缩放等）
- [x] 2.2 实现 handleTouchStart 处理单指和双指触摸开始
- [x] 2.3 实现 handleTouchMove 处理单指拖拽和双指缩放
- [x] 2.4 实现 handleTouchEnd 处理触摸结束和清理
- [x] 2.5 添加双击检测逻辑（记录上次触摸时间，判断间隔）
- [x] 2.6 使用 useEffect 注册 touch 事件监听器（passive: false）
- [x] 2.7 添加触屏与鼠标事件冲突防护（isTouch ref 标志位）
- [x] 2.8 在容器元素上添加 touch-action: none CSS

## 3. Vue 图片渲染器触屏支持

- [x] 3.1 添加触屏相关响应式数据（触点信息、初始距离、初始缩放等）
- [x] 3.2 实现 handleTouchStart 方法处理单指和双指触摸开始
- [x] 3.3 实现 handleTouchMove 方法处理单指拖拽和双指缩放
- [x] 3.4 实现 handleTouchEnd 方法处理触摸结束和清理
- [x] 3.5 添加双击检测逻辑（记录上次触摸时间，判断间隔）
- [x] 3.6 在 onMounted 中注册 touch 事件监听器（passive: false）
- [x] 3.7 添加触屏与鼠标事件冲突防护（isTouch ref 标志位）
- [x] 3.8 在容器元素上添加 touch-action: none CSS

## 4. 边界与性能优化

- [x] 4.1 复用现有 clampPosition 函数确保触屏拖拽不超出边界
- [x] 4.2 为双指缩放添加最小距离变化阈值（防止抖动）
- [x] 4.3 确保触屏缩放同样受 0.01x-10x 限制
- [x] 4.4 验证 touch 事件处理函数不阻塞渲染（必要时使用 requestAnimationFrame）

## 5. 测试与验证

- [ ] 5.1 在 iOS Safari 上测试所有触屏手势
- [ ] 5.2 在 Android Chrome 上测试所有触屏手势
- [ ] 5.3 在支持触屏的笔记本（如 Surface）上测试触屏与鼠标混用场景
- [ ] 5.4 验证多页 TIFF 图片的触屏交互正常
- [ ] 5.5 验证图片旋转后触屏手势依然正确
- [ ] 5.6 确认没有控制台警告（如 passive listener warning）
- [ ] 5.7 验证 React 和 Vue 版本的触屏体验一致

## 6. 文档更新

- [x] 6.1 更新 CHANGELOG.md 记录新增触屏支持
- [x] 6.2 如有移动端使用文档，补充触屏手势说明
