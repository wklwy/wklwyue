# @wklwyue Monorepo

一个基于 pnpm workspace 的 TypeScript monorepo 项目，包含多个实用工具包。

A TypeScript monorepo project based on pnpm workspace, containing multiple utility packages.

## 📦 包列表 / Packages

### [@wklwyue/event-bus](./packages/event-bus)

轻量级事件总线，基于 mitt 思想进行增强，支持 TypeScript。

Lightweight event bus enhanced based on mitt, with TypeScript support.

**特性 / Features:**

- 🚀 轻量级，压缩后仅几 KB / Lightweight, only a few KB after compression
- 🔒 完整的 TypeScript 支持 / Full TypeScript support
- 🎯 功能增强：once、has、listenerCount、clear / Enhanced features: once, has, listenerCount, clear
- 🌟 通配符支持 / Wildcard support
- 📦 多格式支持：CommonJS 和 ES Modules / Multi-format support: CommonJS and ES Modules

## 🚀 快速开始 / Quick Start

### 安装依赖 / Install Dependencies

```bash
pnpm install
```

### 构建所有包 / Build All Packages

```bash
pnpm build
```

### 运行测试 / Run Tests

```bash
pnpm test
```

### 监视模式测试 / Test in Watch Mode

```bash
pnpm test:watch
```

### 创建新包 / Create New Package

```bash
pnpm create-package [包名]
# 或者 / or
node scripts/create-package.js [包名]
```

如果不提供包名，脚本会提示你输入。

If no package name is provided, the script will prompt you to enter one.

### 发布包 / Publish Packages

```bash
pnpm publish
```

## 🛠️ 开发工具 / Development Tools

- **TypeScript**: 类型安全的 JavaScript / Type-safe JavaScript
- **pnpm**: 快速、节省磁盘空间的包管理器 / Fast, disk space efficient package manager
- **tsup**: 零配置 TypeScript 构建工具 / Zero config TypeScript build tool
- **Vitest**: 快速的单元测试框架 / Fast unit testing framework
- **Prettier**: 代码格式化工具 / Code formatter

## 📁 项目结构 / Project Structure

```
.
├── packages/                 # 所有子包 / All sub-packages
│   └── event-bus/           # 事件总线包 / Event bus package
│       ├── src/             # 源代码 / Source code
│       ├── __tests__/       # 测试文件 / Test files
│       ├── dist/            # 构建输出 / Build output
│       ├── package.json     # 包配置 / Package config
│       └── README.md        # 包文档 / Package documentation
├── scripts/                 # 脚本文件 / Script files
│   └── create-package.js    # 创建新包脚本 / Create new package script
├── package.json             # 根配置 / Root config
├── pnpm-workspace.yaml      # workspace 配置 / Workspace config
├── tsconfig.base.json       # 基础 TS 配置 / Base TypeScript config
├── prettier.config.js       # Prettier 配置 / Prettier config
└── README.md               # 项目文档 / Project documentation
```

## 🔧 配置说明 / Configuration

### TypeScript 配置 / TypeScript Configuration

项目使用 `tsconfig.base.json` 作为基础配置，各个包可以继承并扩展这个配置。

The project uses `tsconfig.base.json` as the base configuration, and each package can inherit and extend this configuration.

### Prettier 配置 / Prettier Configuration

统一的代码格式化规则定义在 `prettier.config.js` 中，确保整个项目的代码风格一致。

Unified code formatting rules are defined in `prettier.config.js` to ensure consistent code style across the entire project.

### pnpm Workspace

通过 `pnpm-workspace.yaml` 配置，将 `packages/*` 下的所有目录作为独立的包进行管理。

Configured through `pnpm-workspace.yaml`, all directories under `packages/*` are managed as independent packages.

## 📝 贡献指南 / Contributing

1. Fork 这个仓库 / Fork this repository
2. 创建功能分支 / Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 提交更改 / Commit your changes (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 / Push to the branch (`git push origin feature/amazing-feature`)
5. 打开 Pull Request / Open a Pull Request

## 📄 许可证 / License

MIT

## 🤝 支持 / Support

如果你觉得这个项目有用，请给它一个 ⭐️！

If you find this project useful, please give it a ⭐️!

---

Made with ❤️ by [wklwyue](https://github.com/wklwy)
