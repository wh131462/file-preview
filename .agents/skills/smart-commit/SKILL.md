---
name: smart-commit
description: 智能分组提交代码。按功能/模块划分未提交的代码，分批次有条理地 commit。当用户提到"提交"、"commit"、"分组提交"时使用。
---

# 智能分组提交

## 核心约束

- commit message **禁止** `Co-Authored-By` 或任何 AI 标识
- **禁止** `--amend`/`--force`/`--no-verify`（除非用户明确要求）
- husky 失败时必须先 stash 备份再修复

## 执行流程

### 1. 收集信息（单次脚本执行）

```bash
echo "=== Git Status ===" && git status && \
echo -e "\n=== Staged ===" && git diff --cached --stat && \
echo -e "\n=== Unstaged ===" && git diff --stat && \
echo -e "\n=== Recent Commits ===" && git log --oneline -5 && \
echo -e "\n=== Remote Sync ===" && git fetch origin && git status -sb
```

若有远程更新，先 `git pull --rebase` 解决冲突后再继续。

### 2. 分析分组

按以下维度分组：
- **模块**: 按目录结构划分（如 src/、packages/、apps/）
- **类型**: feat/fix/refactor/style/docs/chore/test/perf
- **功能关联**: 相关文件归为一组（组件 + hooks + 类型定义）

### 3. 确认方案（使用 AskUserQuestion 工具）

展示分组方案后，使用 `AskUserQuestion` 工具让用户确认：
- 选项：确认执行 / 调整方案 / 取消

### 4. 批量提交（脚本化）

用户确认后，生成并执行提交脚本（一次 Bash 调用）：

```bash
#!/bin/bash
set -e

# Commit 1
git reset HEAD
git add file1.tsx file2.ts
git commit -m "feat: XXX"

# Commit 2
git add file3.ts
git commit -m "fix: YYY"

echo "✓ 提交完成"
git log --oneline -N
```

### 5. Husky 失败处理

```bash
# 备份 → 修复 → 恢复
git stash push -m "backup-$(date +%H%M%S)" && \
pnpm lint --fix && \
git stash pop && \
git add <files> && git commit -m "<message>"
```

## Commit 格式

```
<type>: <中文描述>
```

类型: feat | fix | refactor | style | docs | chore | test | perf
