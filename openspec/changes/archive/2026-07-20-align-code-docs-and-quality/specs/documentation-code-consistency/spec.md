## ADDED Requirements

### Requirement: 文档示例使用实际公共 API
根 README、框架 README 和 VitePress API 文档中的导入、类型、组件属性及自定义渲染器字段 SHALL 存在于对应包的公共入口和类型声明中。

#### Scenario: 自定义渲染器示例
- **WHEN** 文档展示 `customRenderers` 配置
- **THEN** 示例 MUST 使用 `test` 与 `render` 契约且包含组件所需必填属性

### Requirement: 文档命令和链接可解析
文档列出的根级 pnpm 命令 SHALL 存在于根 `package.json#scripts`，仓库内文档链接 SHALL 指向现有页面。

#### Scenario: 检查开发命令和站内页面
- **WHEN** 运行文档一致性测试
- **THEN** 测试 MUST 拒绝不存在的根脚本和仓库内页面路径

### Requirement: 请求类型从框架入口导出
React 与 Vue 包根入口 SHALL 导出 `RequestInitFactory`、`RequestHandler`、`RequestOptions`、`Fetcher` 和 `ShouldFetchAsBlob` 类型。

#### Scenario: 用户从框架包导入请求类型
- **WHEN** 用户使用 TypeScript 从 React 或 Vue 根入口导入任一请求类型
- **THEN** 类型检查 MUST 成功

