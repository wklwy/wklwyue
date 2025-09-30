import { describe, it, expect, vi } from "vitest";
import mitt from "../src/index";

describe("安全测试", () => {
  it("应该阻止危险的事件名", () => {
    const bus = mitt<{ normal: string }>();
    const handler = vi.fn();

    // 测试危险的事件名
    expect(() => bus.on("__proto__" as any, handler)).toThrow();
    expect(() => bus.on("constructor" as any, handler)).toThrow();
    expect(() => bus.on("prototype" as any, handler)).toThrow();
  });

  it("应该验证处理器类型", () => {
    const bus = mitt<{ test: string }>();

    // 非函数处理器应该抛出错误
    expect(() => bus.on("test", "not a function" as any)).toThrow(TypeError);
    expect(() => bus.on("test", null as any)).toThrow(TypeError);
    expect(() => bus.on("test", undefined as any)).toThrow(TypeError);
    expect(() => bus.on("test", {} as any)).toThrow(TypeError);
  });

  it("应该隔离处理器错误", () => {
    const bus = mitt<{ test: void }>();
    const handler1 = vi.fn();
    const errorHandler = vi.fn(() => {
      throw new Error("测试错误");
    });
    const handler2 = vi.fn();

    bus.on("test", handler1);
    bus.on("test", errorHandler);
    bus.on("test", handler2);

    // 触发事件不应该抛出错误
    expect(() => bus.emit("test")).not.toThrow();

    // 所有处理器都应该被调用
    expect(handler1).toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it("应该检测内存泄漏", () => {
    const bus = mitt<{ test: number }>();
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 添加大量监听器
    for (let i = 0; i < 1001; i++) {
      bus.on("test", () => {});
    }

    // 模拟开发环境
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    // 检查内存泄漏应该触发警告
    const count = bus.checkMemoryLeaks(1000);
    expect(count).toBe(1001);
    expect(consoleSpy).toHaveBeenCalled();

    // 恢复环境
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  it("应该防止Symbol事件名的原型污染", () => {
    const bus = mitt<Record<symbol, any>>();
    const dangerousSymbol = Symbol("__proto__");
    const handler = vi.fn();

    // Symbol 事件名应该被允许，因为不会造成原型污染
    expect(() => bus.on(dangerousSymbol, handler)).not.toThrow();

    bus.emit(dangerousSymbol, "test");
    expect(handler).toHaveBeenCalledWith("test");
  });

  it("应该正确清理once监听器", () => {
    const bus = mitt<{ test: string }>();
    const handler = vi.fn();

    bus.once("test", handler);
    expect(bus.listenerCount("test")).toBe(1);

    bus.emit("test", "data");
    expect(handler).toHaveBeenCalledWith("data");
    expect(bus.listenerCount("test")).toBe(0);
  });
});
