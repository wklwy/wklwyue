// 事件类型可以是字符串或 symbol
export type EventType = string | symbol;

// 事件映射基础类型 - 更宽松的约束
export type EventMap = Record<EventType, any>;

// 单个事件处理函数（可选参数，禁止返回值用于保持简单语义）
// 注意：事件处理函数将在当前执行环境中运行，请确保传入的处理函数是可信的
export type Handler<T = unknown> = (event: T) => void;

// 通配（*）事件处理函数，会接收到事件名与事件数据
export type WildcardHandler<T extends EventMap> = (type: keyof T, event: T[keyof T]) => void;

// 某个事件类型对应的处理器列表
export type EventHandlerList<T = unknown> = Array<Handler<T>>;
// 通配符事件处理器列表
export type WildCardEventHandlerList<T extends EventMap> = Array<WildcardHandler<T>>;

// 事件映射：事件名 -> 处理函数数组
export type EventHandlerMap<Events extends EventMap> = Map<
  keyof Events | "*",
  EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

// Emitter 对外暴露的接口
export interface Emitter<Events extends EventMap> {
  // 全部事件映射
  all: EventHandlerMap<Events>;

  /** 监听事件 */
  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
  on(type: "*", handler: WildcardHandler<Events>): void;

  /** 仅触发一次的监听 */
  once<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
  once(type: "*", handler: WildcardHandler<Events>): void;

  /** 取消监听，若不传 handler 则移除该事件所有监听 */
  off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
  off(type: "*", handler?: WildcardHandler<Events>): void;

  /** 触发事件（同步执行所有监听器） */
  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;

  /** 判断是否存在监听器 */
  has<Key extends keyof Events>(type: Key): boolean;

  /** 获取监听器数量 */
  listenerCount<Key extends keyof Events>(type: Key): number;

  /** 清空所有事件监听 */
  clear(): void;

  /** 获取所有已注册的事件类型 */
  eventNames(): Array<keyof Events | "*">;

  /** 获取所有监听器的总数 */
  listenerCountAll(): number;

  /** 检查是否存在潜在的内存泄漏（监听器过多） */
  checkMemoryLeaks(warningThreshold?: number): number;
}

// 内部通用处理器联合类型
type GenericEventHandler<Events extends EventMap> = Handler<Events[keyof Events]> | WildcardHandler<Events>;

/**
 * 轻量事件总线（基于 mitt 思想进行增强）：
 * - 增强：once / has / listenerCount / clear
 * - 优化：使用 for...of 代替 map 副作用调用；off 时当列表为空直接删除键，减小内存占用
 * - 中文注释 & 改善类型
 */
export default function mitt<Events extends EventMap>(all?: EventHandlerMap<Events>): Emitter<Events> {
  all = all || new Map();

  function getArray(type: keyof Events | "*") {
    return all!.get(type) as Array<GenericEventHandler<Events>> | undefined;
  }

  function add(type: keyof Events | "*", handler: GenericEventHandler<Events>) {
    // 防止原型污染
    if (typeof type === "string" && (type === "__proto__" || type === "constructor" || type === "prototype")) {
      throw new Error(`Event type "${type}" is not allowed for security reasons`);
    }

    const list = getArray(type);
    if (list) {
      list.push(handler);
    } else {
      all!.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
    }
  }

  return {
    all,

    on(type: any, handler: any) {
      if (typeof handler !== "function") {
        throw new TypeError("Event handler must be a function");
      }
      add(type, handler);
    },

    once(type: any, handler: any) {
      if (typeof handler !== "function") {
        throw new TypeError("Event handler must be a function");
      }
      // 包装一层，执行后自动移除
      const wrap = (evt: any, _typeForWildcard?: any) => {
        // 对于通配符 handler，需要传 (type, evt)
        try {
          if (type === "*") {
            handler(_typeForWildcard, evt);
          } else {
            handler(evt);
          }
        } finally {
          // 确保无论执行是否报错都移除
          this.off(type, wrap as any);
        }
      };
      // 标记原始处理器，方便外层 debug（非必须）
      (wrap as any).__once = true;
      add(type, wrap as any);
    },

    off(type: any, handler?: any) {
      const list = getArray(type);
      if (!list || list.length === 0) return;
      if (!handler) {
        // 如果不传则直接删除 key，释放引用
        all!.delete(type);
        return;
      }
      const idx = list.indexOf(handler);
      if (idx > -1) {
        list.splice(idx, 1);
      }
      if (list.length === 0) {
        all!.delete(type);
      }
    },

    emit(type: any, evt?: any) {
      // 先执行精确匹配
      let handlers = getArray(type);
      if (handlers && handlers.length) {
        // 拷贝一份，防止执行过程中增删造成索引错乱
        const handlersCopy = handlers.slice();
        for (let i = 0; i < handlersCopy.length; i++) {
          try {
            (handlersCopy[i] as Handler<any>)(evt);
          } catch (error) {
            // 在开发环境下输出错误，生产环境下静默处理
            if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
              console.error("Event handler error:", error);
            }
          }
        }
      }
      // 再执行通配符
      const wildcard = getArray("*");
      if (wildcard && wildcard.length) {
        const wildcardCopy = wildcard.slice();
        for (let i = 0; i < wildcardCopy.length; i++) {
          try {
            (wildcardCopy[i] as WildcardHandler<Events>)(type, evt);
          } catch (error) {
            // 在开发环境下输出错误，生产环境下静默处理
            if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
              console.error("Wildcard handler error:", error);
            }
          }
        }
      }
    },

    has(type: any) {
      const list = getArray(type);
      return !!(list && list.length);
    },

    listenerCount(type: any) {
      const list = getArray(type);
      return list ? list.length : 0;
    },

    clear() {
      all!.clear();
    },

    eventNames() {
      return Array.from(all!.keys());
    },

    listenerCountAll() {
      let total = 0;
      for (const handlers of all!.values()) {
        total += handlers.length;
      }
      return total;
    },

    /** 检查是否存在潜在的内存泄漏（监听器过多） */
    checkMemoryLeaks(warningThreshold = 1000) {
      const total = this.listenerCountAll();
      if (total > warningThreshold) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.warn(`Warning: ${total} event handlers registered. Potential memory leak?`);
        }
      }
      return total;
    }
  } as Emitter<Events>;
}
