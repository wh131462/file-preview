# Contributing to File Preview

English | [简体中文](./CONTRIBUTING.zh-CN.md)

Thank you for your interest in contributing to File Preview! This document provides guidelines and instructions for contributing.

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d6.svg" width="20" height="20" alt="📖" /> Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this standard:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f680.svg" width="20" height="20" alt="🚀" /> Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/file-preview.git
cd file-preview
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/wh131462/file-preview.git
```

### Install Dependencies

```bash
pnpm install
```

### Verify Setup

```bash
# Start React demo
pnpm dev

# Start Vue demo
pnpm dev:vue

# Start documentation site
pnpm dev:docs
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> Development Workflow

### Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Make Your Changes

1. Edit files in the appropriate package
2. Test your changes locally
3. Add tests if applicable
4. Update documentation if needed

### Build and Test

```bash
# Build all packages
pnpm build

# Build library only
pnpm build:lib

# Run linter
pnpm lint

# Run type checking
pnpm type-check
```

### Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/master
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="20" height="20" alt="📁" /> Project Structure

```
file-preview/
├── packages/
│   ├── file-preview-core/        # Framework-agnostic core
│   │   ├── src/
│   │   │   ├── types/            # TypeScript type definitions
│   │   │   ├── utils/            # Utility functions
│   │   │   └── loaders/          # File loaders and parsers
│   │   └── package.json
│   │
│   ├── react-file-preview/       # React bindings
│   │   ├── src/
│   │   │   ├── components/       # React components
│   │   │   ├── renderers/        # File type renderers
│   │   │   └── hooks/            # Custom React hooks
│   │   └── package.json
│   │
│   ├── vue-file-preview/         # Vue bindings
│   │   ├── src/
│   │   │   ├── components/       # Vue components
│   │   │   └── composables/      # Vue composables
│   │   └── package.json
│   │
│   ├── example/                  # React demo app
│   ├── vue-example/              # Vue demo app
│   └── docs/                     # VitePress documentation
│
├── openspec/                     # OpenSpec change records
└── pnpm-workspace.yaml
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2728.svg" width="20" height="20" alt="✨" /> Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types, avoid `any`
- Export public types from package entry points

### Code Style

- Follow existing code style
- Use ESLint configuration provided
- Run `pnpm lint` before committing

### Naming Conventions

- **Components**: PascalCase (e.g., `FilePreviewModal`)
- **Files**: PascalCase for components, camelCase for utilities
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### Best Practices

- Keep components focused and single-purpose
- Extract reusable logic into hooks/composables
- Write self-documenting code with clear names
- Add comments for complex logic
- Avoid deep nesting (max 3 levels)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" width="20" height="20" alt="📝" /> Commit Guidelines

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI configuration changes

### Scope

- `core`: Changes to file-preview-core
- `react`: Changes to react-file-preview
- `vue`: Changes to vue-file-preview
- `docs`: Changes to documentation
- `example`: Changes to demo apps

### Examples

```bash
feat(react): add support for HEIC image format
fix(core): correct MIME type detection for AVIF files
docs: update quick start guide
refactor(vue): simplify FilePreviewEmbed props
perf(react): optimize image rendering performance
chore(deps): upgrade pdfjs-dist to 4.0.0
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f504.svg" width="20" height="20" alt="🔄" /> Pull Request Process

### Before Submitting

1. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> Ensure all tests pass
2. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> Run linter and fix any issues
3. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> Update documentation if needed
4. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> Rebase on latest upstream/master

### PR Title

Use the same format as commit messages:

```
feat(react): add zoom controls to image viewer
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123

## Screenshots (if applicable)
Add screenshots or GIFs demonstrating the changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f9ea.svg" width="20" height="20" alt="🧪" /> Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

- Add unit tests for new utilities and logic
- Add component tests for new components
- Ensure edge cases are covered

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4da.svg" width="20" height="20" alt="📚" /> Documentation

### When to Update Documentation

- Adding new features
- Changing public APIs
- Adding new supported file formats
- Fixing bugs that affect documented behavior

### Documentation Locations

- **README files**: Quick start and basic usage
- **VitePress docs** (`packages/docs/`): Comprehensive guides and API reference
- **Code comments**: TSDoc comments for exported functions and types

### Documentation Style

- Clear and concise
- Include code examples
- Use proper formatting (code blocks, tables, lists)
- Keep English and Chinese versions in sync

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e2.svg" width="20" height="20" alt="📢" /> Adding Support for New File Formats

### Process

1. **Add type detection** in `packages/file-preview-core/src/utils/mimeTypes.ts`
2. **Create renderer component** in `packages/react-file-preview/src/renderers/` (and Vue equivalent)
3. **Add loader logic** in `packages/file-preview-core/src/loaders/` if needed
4. **Update documentation** in supported formats list
5. **Add example** to demo apps
6. **Update OpenSpec** with change record

### Example

See existing renderers like `Image`, `Video`, or `PDF` as templates.

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2753.svg" width="20" height="20" alt="❓" /> Questions?

- Open an [issue](https://github.com/wh131462/file-preview/issues) for bug reports or feature requests
- Join discussions in [GitHub Discussions](https://github.com/wh131462/file-preview/discussions)
- Check existing issues and PRs before creating new ones

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f64f.svg" width="20" height="20" alt="🙏" /> Thank You!

Your contributions make this project better. We appreciate your time and effort!

---

## License

By contributing to File Preview, you agree that your contributions will be licensed under the MIT License.
