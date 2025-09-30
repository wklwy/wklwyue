# @wklwyue/event-bus

[![npm version](https://badge.fury.io/js/@wklwyue%2Fevent-bus.svg)](https://badge.fury.io/js/@wklwyue%2Fevent-bus)

轻量级事件总线，基于 [mitt](https://github.com/developit/mitt) 思想进行增强，完全使用 TypeScript 编写。

## 特性

- 🚀 **轻量级**：压缩后仅几 KB
- 🔒 **类型安全**：完整的 TypeScript 支持
- 🎯 **功能增强**：在 mitt 基础上新增 `once`、`has`、`listenerCount`、`clear` 方法
- 🌟 **通配符支持**：使用 `*` 监听所有事件
- 📦 **多格式支持**：同时支持 CommonJS 和 ES Modules
- 🔄 **零依赖**：不依赖任何第三方库

## 安装

```bash
npm install @wklwyue/event-bus
# 或
yarn add @wklwyue/event-bus
# 或
pnpm add @wklwyue/event-bus
```

## 基本用法

```typescript
import mitt from "@wklwyue/event-bus";

// 定义事件类型
interface Events {
  login: { userId: string };
  logout: void;
  count: number;
}

// 创建事件总线
const bus = mitt<Events>();

// 监听事件
bus.on("login", (data) => {
  console.log("用户登录:", data.userId); // 完整的类型推断
});

// 触发事件
bus.emit("login", { userId: "123" });

// 一次性监听
bus.once("logout", () => {
  console.log("用户已登出");
});

// 移除监听器
const handler = (count: number) => console.log(count);
bus.on("count", handler);
bus.off("count", handler);

// 移除所有监听器
bus.off("count");

// 通配符监听所有事件
bus.on("*", (type, data) => {
  console.log(`事件 ${type} 被触发:`, data);
});
```

## API

### `mitt<Events>()`

创建一个新的事件总线实例。

### `on(type, handler)`

添加事件监听器。

```typescript
bus.on("eventName", (data) => {
  // 处理事件
});

// 监听所有事件
bus.on("*", (type, data) => {
  // 处理任意事件
});
```

### `once(type, handler)`

添加一次性事件监听器，执行一次后自动移除。

```typescript
bus.once("eventName", (data) => {
  // 只会执行一次
});
```

### `off(type, handler?)`

移除事件监听器。

```typescript
// 移除指定监听器
bus.off("eventName", handler);

// 移除该事件的所有监听器
bus.off("eventName");
```

### `emit(type, data?)`

触发事件。

```typescript
bus.emit("eventName", data);

// 对于可选数据的事件
bus.emit("eventName");
```

### `has(type)`

检查是否存在指定事件的监听器。

```typescript
if (bus.has("eventName")) {
  console.log("存在监听器");
}
```

### `listenerCount(type)`

获取指定事件的监听器数量。

```typescript
const count = bus.listenerCount("eventName");
console.log(`监听器数量: ${count}`);
```

### `clear()`

清空所有事件监听器。

```typescript
bus.clear();
```

## 类型定义

```typescript
// 事件类型映射
interface Events {
  eventName: DataType;
  // 对于不需要数据的事件，使用 void
  simpleEvent: void;
}

// 事件处理器
type Handler<T> = (event: T) => void;

// 通配符处理器
type WildcardHandler<T> = (type: keyof T, event: T[keyof T]) => void;
```

## 与 mitt 的区别

在保持 mitt 核心功能的基础上，新增了以下功能：

- ✨ `once()` - 一次性事件监听
- ✨ `has()` - 检查监听器是否存在
- ✨ `listenerCount()` - 获取监听器数量
- ✨ `clear()` - 清空所有监听器
- 🔧 优化了内存管理（空监听器列表会被自动清理）
- 🔧 改进了执行过程中动态增删监听器的处理

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
