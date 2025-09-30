import { describe, it, expect, vi } from "vitest";
import mitt from "../src/index";

// 增加索引签名以满足 mitt 的 Record<EventType, unknown> 约束
// 具体事件类型仍然是更窄的类型，兼容更宽的 unknown
interface BaseEvents {
  login: { userId: string };
  logout: void;
  count: number;
}

// 同时提供 string 与 symbol 索引签名
// 这样即可满足 Record<EventType, unknown> 的约束
// （注意：不会影响已声明的精确事件类型推断）
type Events = BaseEvents & { [key: string]: unknown; [key: symbol]: unknown };

describe("mitt 增强事件总线", () => {
  it("基本 on / emit 功能", () => {
    const bus = mitt<Events>();
    const fn = vi.fn();
    bus.on("count", fn);
    bus.emit("count", 1);
    bus.emit("count", 2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });

  it("once 只触发一次", () => {
    const bus = mitt<Events>();
    const fn = vi.fn();
    bus.once("count", fn);
    bus.emit("count", 1);
    bus.emit("count", 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it("off 可移除指定监听器", () => {
    const bus = mitt<Events>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on("count", fn1);
    bus.on("count", fn2);
    bus.off("count", fn1);
    bus.emit("count", 3);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("off 不传 handler 移除该事件全部监听", () => {
    const bus = mitt<Events>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on("count", fn1);
    bus.on("count", fn2);
    bus.off("count");
    bus.emit("count", 10);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("通配符 * 可以接收所有事件", () => {
    const bus = mitt<Events>();
    const any = vi.fn();
    const fn = vi.fn();
    bus.on("*", any);
    bus.on("count", fn);
    bus.emit("count", 99);
    expect(fn).toHaveBeenCalledWith(99);
    expect(any).toHaveBeenCalledWith("count", 99);
  });

  it("has 与 listenerCount 正常工作", () => {
    const bus = mitt<Events>();
    expect(bus.has("count")).toBe(false);
    bus.on("count", () => {});
    expect(bus.has("count")).toBe(true);
    expect(bus.listenerCount("count")).toBe(1);
    bus.on("count", () => {});
    expect(bus.listenerCount("count")).toBe(2);
  });

  it("clear 清空所有监听", () => {
    const bus = mitt<Events>();
    bus.on("count", () => {});
    bus.on("login", () => {});
    bus.on("*", () => {});
    expect(bus.listenerCount("count")).toBe(1);
    bus.clear();
    expect(bus.has("count")).toBe(false);
    expect(bus.all.size).toBe(0);
  });

  it("emit 过程中新增监听不会影响本次派发", () => {
    const bus = mitt<Events>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on("count", () => {
      fn1();
      bus.on("count", fn2); // 动态添加
    });
    bus.emit("count", 1);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled(); // 新增的不会在本次触发
    bus.emit("count", 2);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("emit 过程中移除监听不会跳过其他监听器", () => {
    const bus = mitt<Events>();
    const order: string[] = [];
    const a = () => {
      order.push("a");
      bus.off("count", b);
    };
    const b = () => order.push("b");
    const c = () => order.push("c");
    bus.on("count", a);
    bus.on("count", b);
    bus.on("count", c);
    bus.emit("count", 0);
    expect(order).toEqual(["a", "b", "c"]);
    order.length = 0;
    bus.emit("count", 1);
    expect(order).toEqual(["a", "c"]);
  });
});
