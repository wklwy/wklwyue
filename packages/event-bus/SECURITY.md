# 安全使用指南

## 🔒 安全注意事项

### ⚠️ 重要安全提醒

1. **谨慎注册事件处理器**
   - 只注册可信的事件处理函数
   - 避免注册来源不明的回调函数
   - 不要在处理器中执行用户输入的代码

```typescript
// ❌ 危险：执行用户输入的代码
bus.on("user-action", data => {
  eval(data.code); // 极度危险！
});

// ✅ 安全：验证和清理输入
bus.on("user-action", data => {
  if (typeof data.action === "string" && ALLOWED_ACTIONS.includes(data.action)) {
    handleAction(data.action);
  }
});
```

2. **防止原型污染**
   - 库已内置保护，阻止使用 `__proto__`、`constructor`、`prototype` 作为事件名
   - 仍建议使用明确的事件名称

3. **内存泄漏预防**
   - 及时移除不再需要的事件监听器
   - 使用 `checkMemoryLeaks()` 方法监控监听器数量
   - 在组件销毁时调用 `clear()` 或 `off()`

```typescript
// React 示例
useEffect(() => {
  const handler = data => {
    /* ... */
  };
  bus.on("event", handler);

  return () => {
    bus.off("event", handler); // 清理监听器
  };
}, []);
```

4. **错误处理**
   - 库已内置错误隔离，单个处理器出错不会影响其他处理器
   - 建议在处理器内部也添加适当的错误处理

5. **数据验证**
   - 对事件数据进行验证和清理
   - 不要信任来自外部的事件数据

```typescript
// ✅ 安全的数据验证
bus.on("user-data", data => {
  if (!isValidUserData(data)) {
    console.warn("Invalid user data received");
    return;
  }
  processUserData(data);
});
```

## 🛡️ 安全功能

### 内置保护机制

1. **原型污染保护**: 自动阻止危险的事件名
2. **错误隔离**: 防止单个处理器错误影响整个系统
3. **类型检查**: 确保处理器是函数类型
4. **内存监控**: 提供内存泄漏检测方法

### 使用安全 API

```typescript
// 检查内存使用
const handlerCount = bus.checkMemoryLeaks(500); // 阈值 500

// 安全清理
bus.clear(); // 清理所有监听器
```

## 📊 安全审计

建议在生产环境中：

1. 定期检查监听器数量
2. 监控错误日志
3. 审计事件处理器的来源
4. 使用 CSP (Content Security Policy) 防止代码注入
