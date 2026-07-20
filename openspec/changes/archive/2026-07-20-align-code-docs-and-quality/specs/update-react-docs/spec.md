## ADDED Requirements

### Requirement: React 文档与当前版本一致
React 双语 README SHALL 描述当前 1.x 已实现能力，不得把已发布 API 标为 v2.0+，并 SHALL 与根入口导出的请求类型和高级图片 Worker 行为一致。

#### Scenario: React 文档 API 审查
- **WHEN** 对照 React `src/index.ts` 和 README
- **THEN** 文档导入、版本标签和 Worker 描述 MUST 与实现一致

