# quality-gates Specification

## Purpose
TBD - created by archiving change align-code-docs-and-quality. Update Purpose after archive.
## Requirements
### Requirement: ESLint 质量门禁可执行
仓库 SHALL 提供 ESLint 9 flat config，使根级 `pnpm lint` 能检查项目 TypeScript、TSX 和 Vue 相关源码并以 warning 为失败。

#### Scenario: 执行 lint
- **WHEN** 开发者在已安装依赖的仓库执行 `pnpm lint`
- **THEN** ESLint MUST 找到配置并以退出码 0 完成

### Requirement: 自动化测试入口
仓库 SHALL 提供根级 `pnpm test`，覆盖公开导出、文件类型识别、请求工具和文档静态一致性。

#### Scenario: 执行自动化测试
- **WHEN** 开发者执行 `pnpm test`
- **THEN** 所有契约测试 MUST 运行且失败时返回非零退出码

### Requirement: 完整验证链路
变更完成前 SHALL 运行 lint、test、库构建、文档构建和 size-limit。

#### Scenario: 发布前验证
- **WHEN** 本次变更实现完成
- **THEN** `pnpm lint`、`pnpm test`、`pnpm build:lib`、`pnpm build:docs` 和 `pnpm size` MUST 全部通过

