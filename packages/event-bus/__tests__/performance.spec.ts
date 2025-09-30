import { describe, it, expect, vi } from "vitest";
import mitt from "../src/index";

describe("性能测试", () => {
  it("大量事件监听器性能测试", () => {
    const bus = mitt<{ test: number }>();
    const handlers: Array<(data: number) => void> = [];

    // 添加999个监听器
    const start = performance.now();
    for (let i = 0; i < 999; i++) {
      const handler = vi.fn();
      handlers.push(handler);
      bus.on("test", handler);
    }
    const addTime = performance.now() - start;

    // 触发事件
    const emitStart = performance.now();
    bus.emit("test", 42);
    const emitTime = performance.now() - emitStart;

    // 移除所有监听器
    const removeStart = performance.now();
    for (const handler of handlers) {
      bus.off("test", handler);
    }
    const removeTime = performance.now() - removeStart;

    console.log(`添加999个监听器耗时: ${addTime.toFixed(2)}ms`);
    console.log(`触发事件耗时: ${emitTime.toFixed(2)}ms`);
    console.log(`移除999个监听器耗时: ${removeTime.toFixed(2)}ms`);

    // 验证所有处理器都被调用
    handlers.forEach((handler) => {
      expect(handler).toHaveBeenCalledWith(42);
    });

    // 验证清理完成
    expect(bus.listenerCount("test")).toBe(0);
  });

  it("错误处理不影响其他监听器", () => {
    const bus = mitt<{ test: void }>();
    const handler1 = vi.fn();
    const errorHandler = vi.fn(() => {
      throw new Error("测试错误");
    });
    const handler2 = vi.fn();

    bus.on("test", handler1);
    bus.on("test", errorHandler);
    bus.on("test", handler2);

    // 触发事件，应该不会因为错误而中断
    expect(() => bus.emit("test")).not.toThrow();

    // 验证所有处理器都被调用
    expect(handler1).toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it("新增的实用方法测试", () => {
    const bus = mitt<{
      event1: string;
      event2: number;
    }>();

    bus.on("event1", () => {});
    bus.on("event1", () => {});
    bus.on("event2", () => {});
    bus.on("*", () => {});

    // 测试 eventNames
    const eventNames = bus.eventNames();
    expect(eventNames).toContain("event1");
    expect(eventNames).toContain("event2");
    expect(eventNames).toContain("*");

    // 测试 listenerCountAll
    expect(bus.listenerCountAll()).toBe(4);

    // 测试单个事件的监听器数量
    expect(bus.listenerCount("event1")).toBe(2);
    expect(bus.listenerCount("event2")).toBe(1);
  });
});
