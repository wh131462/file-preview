## ADDED Requirements

### Requirement: Toolbar button ARIA labels
所有工具栏按钮必须包含描述性的 aria-label 属性。

#### Scenario: Zoom in button
- **WHEN** 渲染缩放放大按钮
- **THEN** 按钮包含 aria-label="放大"（或对应语言的翻译）

#### Scenario: Zoom out button
- **WHEN** 渲染缩放缩小按钮
- **THEN** 按钮包含 aria-label="缩小"

#### Scenario: Download button
- **WHEN** 渲染下载按钮
- **THEN** 按钮包含 aria-label="下载文件"

#### Scenario: Close button
- **WHEN** 渲染关闭按钮
- **THEN** 按钮包含 aria-label="关闭预览"

#### Scenario: Language-aware labels
- **WHEN** 切换语言（locale）
- **THEN** aria-label 自动更新为对应语言的翻译（通过 t() 函数）

### Requirement: Navigation arrows ARIA labels
导航箭头必须包含描述性的 aria-label 属性。

#### Scenario: Previous arrow
- **WHEN** 渲染左侧导��箭头
- **THEN** 按钮包含 aria-label="上一个文件"

#### Scenario: Next arrow
- **WHEN** 渲染右侧导航箭头
- **THEN** 按钮包含 aria-label="下一个文件"

#### Scenario: Disabled state
- **WHEN** 导航箭头被禁用（如已在第一个文件）
- **THEN** 按钮包含 aria-disabled="true" 属性

### Requirement: Keyboard shortcuts ARIA
工具栏按钮必须声明对应的键盘快捷键。

#### Scenario: Previous navigation shortcut
- **WHEN** 渲染左侧导航箭头
- **THEN** 按钮包含 aria-keyshortcuts="ArrowLeft" 或 "Left"

#### Scenario: Next navigation shortcut
- **WHEN** 渲染右侧导航箭头
- **THEN** 按钮包含 aria-keyshortcuts="ArrowRight" 或 "Right"

#### Scenario: Close shortcut
- **WHEN** 渲染关闭按钮（modal 模式）
- **THEN** 按钮包含 aria-keyshortcuts="Escape"

### Requirement: Page number live region
页码信息必须使用 aria-live 通知屏幕阅读器。

#### Scenario: PDF page change announcement
- **WHEN** PDF 当前页码改变
- **THEN** 页码信息区域包含 aria-live="polite" 和 aria-atomic="true"

#### Scenario: Screen reader announcement
- **WHEN** 页码从 1 更新到 2
- **THEN** 屏幕阅读器朗读"第 2 页，共 10 页"

#### Scenario: EPUB chapter change announcement
- **WHEN** EPUB 章节改变
- **THEN** 屏幕阅读器朗读"第 3 章，共 15 章"

### Requirement: Focus management
键盘焦点必须正确管理，支持键盘导航。

#### Scenario: Modal mode focus trap
- **WHEN** modal 模式打开
- **THEN** 焦点自动移至预览容器，Tab 键循环在预览区域内

#### Scenario: Embed mode focusable container
- **WHEN** embed 模式渲染
- **THEN** 根容器包含 tabIndex={0}，可通过 Tab 键获得焦点

#### Scenario: Toolbar button tab order
- **WHEN** 用户按 Tab 键
- **THEN** 焦点按逻辑顺序移动（文件名 → 工具按钮 → 下载 → 关闭）

#### Scenario: Escape key closes modal
- **WHEN** modal 模式下按 Escape 键
- **THEN** 预览关闭，焦点返回触发元素（如可能）

### Requirement: Color contrast compliance
所有 UI 元素必须满足 WCAG AA 级别的色彩对比度要求。

#### Scenario: Button text contrast
- **WHEN** 测量按钮文本和背景的对比度
- **THEN** 对比度 >= 4.5:1（正常文本）或 >= 3:1（大文本）

#### Scenario: Icon contrast
- **WHEN** 测量工具栏图标和背景的对比度
- **THEN** 对比度 >= 3:1（非文本内容）

#### Scenario: Dark theme contrast
- **WHEN** 切换到 dark 主题
- **THEN** 所有元素对比度仍满足 WCAG AA 要求
