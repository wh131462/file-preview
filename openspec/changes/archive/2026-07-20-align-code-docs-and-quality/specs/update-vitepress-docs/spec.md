## ADDED Requirements

### Requirement: VitePress 内容与实现一致
VitePress SHALL 删除重复章节、过期版本标签和无法由实现支撑的性能承诺，并 SHALL 准确描述 Worker 回退、公开类型和现有构建结构。

#### Scenario: 构建并检查文档站
- **WHEN** 执行文档一致性测试和 VitePress 构建
- **THEN** API 页面、指南页面和站内链接 MUST 通过检查

