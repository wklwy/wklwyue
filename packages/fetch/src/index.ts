import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig // 使用新的内部请求配置类型
} from "axios";

// ==================================
//          类型定义 (Types)
// ==================================

/** 统一的数据载荷类型 */
export type HttpData = Record<string, unknown>;
/** 统一的URL查询参数类型 */
export type HttpParams = Record<string, string | number | boolean | null | undefined>;

/**
 * 业务响应的通用结构。
 * T - 实际数据的类型。
 */
export interface IBusinessResponse<T = any> {
  /** 业务状态码 */
  code: number;
  /** 业务消息 */
  msg: string;
  /** 实际数据 */
  data: T;
  [key: string]: any;
}

/** 待处理请求的记录接口 */
export interface IPendingRequest {
  timestamp: number;
  controller: AbortController;
  url: string;
  method: string;
  requestKey: string;
}

/**
 * HttpRequest 类的核心配置项
 * 允许用户在创建实例时深度定制其行为
 */
export interface HttpRequestOptions {
  /** 基础URL */
  baseURL?: string;
  /** 超时时间 */
  timeout?: number;
  /** Axios 的原生配置 */
  httpConfig?: AxiosRequestConfig;
  /**
   * 自定义拦截器
   * 允许用户注入自己的逻辑，覆盖默认行为
   */
  interceptors?: {
    /** 请求成功拦截器 */
    requestSuccess?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
    /** 请求失败拦截器 */
    requestError?: (error: any) => any;
    /** 响应成功拦截器 */
    responseSuccess?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
    /** 响应失败拦截器 */
    responseError?: (error: AxiosError) => any;
  };
  /**
   * 生成请求唯一标识的函数
   * @param config Axios请求配置
   * @returns string
   */
  generateRequestKey?: (config: AxiosRequestConfig) => string;
  /**
   * 解析业务响应的函数。
   * 如果返回 Promise.reject，则会触发响应失败拦截器。
   * @param response Axios 原始响应
   * @returns 解析后的数据或原始响应
   */
  responseParser?: <T = any>(response: AxiosResponse<T>) => any;
  /**
   * 防抖时间（毫秒），用于取消重复请求
   * @default 200
   */
  debounceTime?: number;
  /**
   * 是否开启调试模式
   * @default false
   */
  debug?: boolean;
  /**
   * 语言环境，用于错误消息国际化
   * @default 'zh'
   */
  locale?: "zh" | "en";
  /**
   * 业务成功状态码列表
   * @default [200]
   */
  successCodes?: number[];
  /**
   * 重试次数
   * @default 0
   */
  retryTimes?: number;
  /**
   * 重试延迟（毫秒）
   * @default 1000
   */
  retryDelay?: number;
  /**
   * 重试条件函数，返回 true 则重试
   * @default 重试网络错误和 5xx 状态码
   */
  retryCondition?: (error: AxiosError) => boolean;
}

/**
 * 业务错误类
 */
export class BusinessError extends Error {
  public code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "BusinessError";
    this.code = code;
  }
}

// ==================================
//        HttpRequest 核心类
// ==================================

/**
 * HTTP请求封装类
 * @description 提供 get, post, put, delete 等方法，并内置了请求防抖、错误处理、拦截器等功能。
 */
class HttpRequest {
  private instance: AxiosInstance;
  private baseURL: string;
  private pendingRequests: Map<string, IPendingRequest> = new Map();
  private readonly debounceTime: number;
  private readonly generateRequestKey: (config: AxiosRequestConfig) => string;
  private readonly debug: boolean;
  private readonly retryTimes: number;
  private readonly retryDelay: number;
  private readonly retryCondition: (error: AxiosError) => boolean;

  /**
   * @param options 初始化配置
   */
  constructor(options: HttpRequestOptions = {}) {
    this.baseURL = options.baseURL || "";
    this.debounceTime = options.debounceTime ?? 200;
    this.debug = options.debug ?? false;
    this.retryTimes = options.retryTimes ?? 0;
    this.retryDelay = options.retryDelay ?? 1000;
    this.retryCondition = options.retryCondition || this.defaultRetryCondition;

    // 允许用户自定义请求Key的生成逻辑
    this.generateRequestKey = options.generateRequestKey || this.defaultGenerateRequestKey;

    // 合并 timeout 配置，优先级：options.timeout > options.httpConfig.timeout
    const timeout = options.timeout ?? options.httpConfig?.timeout;
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout,
      ...(options.httpConfig || {})
    });

    // 注入用户自定义的或默认的拦截器
    this.setupInterceptors(options.interceptors, options.responseParser);
  }

  /**
   * 默认的请求Key生成器
   */
  private defaultGenerateRequestKey(config: AxiosRequestConfig): string {
    const { url = "", method = "", params, data } = config;
    // 更安全的序列化方法
    const safeSerializer = (v: any): string => {
      try {
        if (typeof v === "string") return v;
        if (v === null || v === undefined) return "";
        // FormData 特殊处理
        if (typeof FormData !== "undefined" && v instanceof FormData) {
          const entries: string[] = [];
          v.forEach((val, key) => {
            entries.push(`${key}=${String(val)}`);
          });
          entries.sort();
          return entries.join("&");
        }
        return JSON.stringify(v);
      } catch (e) {
        return `[Unserializable value: ${String(v)}]`;
      }
    };
    return [url, method.toUpperCase(), safeSerializer(params), safeSerializer(data)].join("||");
  }

  /**
   * 检查并取消重复请求
   */
  private checkDuplicateRequest(config: InternalAxiosRequestConfig): void {
    const requestKey = this.generateRequestKey(config);
    const existingRequest = this.pendingRequests.get(requestKey);

    if (existingRequest) {
      const currentTime = Date.now();
      if (currentTime - existingRequest.timestamp < this.debounceTime) {
        const message = `重复请求被取消: ${config.url}`;
        existingRequest.controller.abort(message);
        if (this.debug) console.log(`[HttpRequest] 取消重复请求: ${config.method?.toUpperCase()} ${config.url}`);
      }
      this.pendingRequests.delete(requestKey);
    }

    const controller = new AbortController();
    config.signal = controller.signal;

    this.pendingRequests.set(requestKey, {
      timestamp: Date.now(),
      controller,
      url: config.url || "",
      method: config.method || "get",
      requestKey
    });
  }

  /**
   * 从待处理列表中移除请求
   */
  private removeRequest(config: AxiosRequestConfig): void {
    const requestKey = this.generateRequestKey(config);
    this.pendingRequests.delete(requestKey);
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(interceptors?: HttpRequestOptions["interceptors"], responseParser?: HttpRequestOptions["responseParser"]): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        this.checkDuplicateRequest(config);
        // 如果用户提供了请求成功拦截器，则执行它
        if (interceptors?.requestSuccess) {
          return interceptors.requestSuccess(config);
        }
        return config;
      },
      error => {
        // 如果用户提供了请求失败拦截器，则执行它
        if (interceptors?.requestError) {
          return interceptors.requestError(error);
        }
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      response => {
        // 无论成功失败，都先移除请求记录
        this.removeRequest(response.config);

        // 如果用户提供了自定义的 responseParser，则使用它
        if (responseParser) {
          return responseParser(response);
        }

        // 如果用户提供了响应成功拦截器，则执行它
        if (interceptors?.responseSuccess) {
          return interceptors.responseSuccess(response);
        }
        // 默认行为：直接返回 data
        return response.data;
      },
      (error: AxiosError) => {
        // 即使请求出错，也要移除
        if (error.config) {
          this.removeRequest(error.config);
        }

        if (axios.isCancel(error)) {
          if (this.debug) console.log(`[HttpRequest] 请求被取消: ${error.message}`);
          return Promise.reject(error);
        }

        // 重试逻辑
        const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
        if (config && this.retryTimes > 0) {
          config._retryCount = (config._retryCount || 0) + 1;
          if (config._retryCount <= this.retryTimes && this.retryCondition(error)) {
            if (this.debug)
              console.log(`[HttpRequest] 重试请求 (${config._retryCount}/${this.retryTimes}): ${config.method?.toUpperCase()} ${config.url}`);
            // 创建一个延迟 Promise
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(this.instance.request(config));
              }, this.retryDelay);
            });
          }
        }

        // 如果用户提供了响应失败拦截器，则执行它
        if (interceptors?.responseError) {
          return interceptors.responseError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // ... (公共方法: get, post, put, delete 等保持不变，但会因拦截器行为改变而受益)

  /**
   * GET请求
   * @param url 请求路径
   * @param params URL参数
   * @param config 其他配置
   * @returns Promise<T> T 为响应数据的类型
   */
  public get<T = unknown, K = HttpParams>(url: string, params?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, { params, ...config });
  }

  /**
   * POST请求
   * @param url 请求路径
   * @param data 请求体数据
   * @param config 其他配置
   * @returns Promise<T>
   */
  public post<T = unknown, K = HttpData>(url: string, data?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  /**
   * PUT请求
   * @param url 请求路径
   * @param data 请求体数据
   * @param config 其他配置
   * @returns Promise<T>
   */
  public put<T = unknown, K = HttpData>(url: string, data?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  /**
   * DELETE请求
   * @param url 请求路径
   * @param params URL参数
   * @param config 其他配置
   * @returns Promise<T>
   */
  public delete<T = unknown, K = HttpParams>(url: string, params?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, { params, ...config });
  }

  /**
   * PATCH请求（部分更新）
   * @param url 请求路径
   * @param data 请求体数据
   * @param config 其他配置
   * @returns Promise<T>
   */
  public patch<T = unknown, K = HttpData>(url: string, data?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  /**
   * HEAD请求（获取响应头）
   * @param url 请求路径
   * @param params URL参数
   * @param config 其他配置
   * @returns Promise<T>
   */
  public head<T = unknown, K = HttpParams>(url: string, params?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.head(url, { params, ...config });
  }

  /**
   * OPTIONS请求（预检请求）
   * @param url 请求路径
   * @param config 其他配置
   * @returns Promise<T>
   */
  public options<T = unknown, K = HttpParams>(url: string, params?: K, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.options(url, { params, ...config });
  }

  /**
   * 上传文件
   * @param url 请求路径
   * @param file 文件对象
   * @param name 文件参数名
   * @param data 其他参数
   * @returns Promise<T>
   */
  public upload<T = unknown, K = Record<string, string>>(url: string, file: File, name = "file", data?: K): Promise<T> {
    const formData = new FormData();
    formData.append(name, file);
    if (data) {
      Object.entries(data).forEach(([key, value]) => formData.append(key, String(value)));
    }
    return this.post<T>(url, formData as unknown as HttpData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }

  /**
   * 下载文件
   * @param url 请求路径
   * @param params 参数
   * @param fileName 文件名(可选)
   */
  public async download(url: string, params?: HttpParams, fileName = "download"): Promise<void> {
    const response = await this.instance.get(url, {
      params,
      responseType: "blob"
    });
    const blob = new Blob([response.data]);
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    const contentDisposition = response.headers?.["content-disposition"];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        fileName = decodeURIComponent(filenameMatch[1]);
      }
    }

    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }

  /**
   * 取消请求
   * @param url 可选，特定URL的请求，不提供则取消所有请求
   * @param message 取消消息
   */
  public cancelRequest(url?: string, message = "请求已手动取消"): void {
    const cancelAndRemove = (req: IPendingRequest, key: string) => {
      req.controller.abort(message);
      this.pendingRequests.delete(key);
      if (this.debug) console.log(`[HttpRequest] 取消请求: ${req.method.toUpperCase()} ${req.url}`);
    };

    if (url) {
      this.pendingRequests.forEach((req, key) => {
        if (req.url === url) cancelAndRemove(req, key);
      });
    } else {
      this.pendingRequests.forEach(cancelAndRemove);
    }
  }

  /**
   * 动态设置请求头
   * @param headers 请求头配置
   */
  public setHeaders(headers: Record<string, string>): void {
    Object.assign(this.instance.defaults.headers.common, headers);
  }

  /**
   * 动态设置基础URL
   * @param baseURL 基础URL
   */
  public setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
  }

  /**
   * 动态设置超时时间
   * @param timeout 超时时间（毫秒）
   */
  public setTimeout(timeout: number): void {
    this.instance.defaults.timeout = timeout;
  }

  /**
   * 默认的重试条件函数
   */
  private defaultRetryCondition(error: AxiosError): boolean {
    return !!error.response && error.response.status >= 500 && error.response.status < 600;
  }
}

// ==================================
//        工厂函数与默认配置
// ==================================

/**
 * 创建一个 HttpRequest 实例。
 * 这个函数是库的主要入口，它封装了默认的最佳实践，同时允许用户深度定制。
 * @param options 自定义配置
 * @returns HttpRequest 实例
 */
function createHttpRequest(options: HttpRequestOptions = {}): HttpRequest {
  // --- 定义默认的最佳实践拦截器 ---

  // 默认请求成功拦截器：添加token
  const defaultRequestSuccess = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const token = window.localStorage.getItem("token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      if (options.debug) console.error("[HttpRequest] 获取 token 失败", e);
    }
    return config;
  };

  // 默认响应失败拦截器：处理HTTP状态码和通用错误
  const defaultResponseError = (error: AxiosError): Promise<any> => {
    const locale = options.locale ?? "zh";
    const messages = {
      zh: {
        requestFailed: "请求失败",
        serverError: (status: number) => `服务器异常(${status})`,
        unauthorized: "未授权，请重新登录",
        forbidden: "没有权限访问该资源",
        notFound: "请求的资源不存在",
        internalServerError: "服务器内部错误",
        networkError: "网络错误，请检查网络连接",
        timeout: "请求超时，请稍后重试",
        configError: "请求配置错误"
      },
      en: {
        requestFailed: "Request failed",
        serverError: (status: number) => `Server error (${status})`,
        unauthorized: "Unauthorized, please log in again",
        forbidden: "Forbidden, no access to this resource",
        notFound: "Resource not found",
        internalServerError: "Internal server error",
        networkError: "Network error, please check your connection",
        timeout: "Request timed out, please try again later",
        configError: "Request configuration error"
      }
    };
    const msg = messages[locale];

    let emsg = msg.requestFailed;
    // 检查是否为超时错误
    if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
      emsg = msg.timeout;
    } else if (error.response) {
      const data = error.response.data as { message?: string; msg?: string };
      emsg = data?.message || data?.msg || msg.serverError(error.response.status);
      switch (error.response.status) {
        case 401:
          emsg = msg.unauthorized;
          break;
        case 403:
          emsg = msg.forbidden;
          break;
        case 404:
          emsg = msg.notFound;
          break;
        case 500:
          emsg = msg.internalServerError;
          break;
      }
    } else if (error.request) {
      emsg = msg.networkError;
    } else {
      emsg = error.message || msg.configError;
    }
    error.message = emsg;
    return Promise.reject(error);
  };

  // 默认业务响应解析器
  // 使用非泛型签名以匹配 HttpRequestOptions.responseParser 的函数类型，避免泛型签名导致的类型不兼容
  const defaultResponseParser: HttpRequestOptions["responseParser"] = (response: AxiosResponse<any>) => {
    const { data } = response as AxiosResponse<IBusinessResponse<any>>;
    const successCodes = options.successCodes ?? [200];

    // code 字段兼容 string/number
    const code = typeof data?.code === "string" ? Number(data.code) : data?.code;
    const msg = data?.msg || data?.message || "业务处理失败";

    if (data) {
      if (code !== undefined && code !== null) {
        if (successCodes.includes(code)) {
          return data.data;
        } else {
          // 业务失败，抛出详细错误
          throw new BusinessError(msg, code);
        }
      } else {
        // 无 code 字段，直接返回原始数据
        return response.data;
      }
    }
    // data 不存在，抛出错误
    return Promise.reject(new Error("响应数据为空"));
  };

  // --- 合并用户配置和默认配置 ---
  const mergedOptions: HttpRequestOptions = {
    ...options, // 用户配置优先级最高
    interceptors: {
      requestSuccess: options.interceptors?.requestSuccess || defaultRequestSuccess,
      requestError: options.interceptors?.requestError || (error => Promise.reject(error)),
      responseSuccess: options.interceptors?.responseSuccess, // 默认不处理，让 responseParser 接管
      responseError: options.interceptors?.responseError || defaultResponseError
    },
    // 只有在用户没有提供 responseSuccess 拦截器时，才使用默认的 parser
    responseParser: options.responseParser ?? (options.interceptors?.responseSuccess ? undefined : defaultResponseParser)
  };

  return new HttpRequest(mergedOptions);
}

// ==================================
//        导出
// ==================================

/**
 * 只导出工厂函数，用户可以创建多个实例，满足不同场景需求。
 */
export default createHttpRequest;
export { createHttpRequest };
