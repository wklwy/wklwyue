# @wklwyue/fetch

一个功能强大、类型安全且高度可配置的 Axios 封装库。它旨在通过提供开箱即用的高级功能（如请求防抖、自动重试、统一错误处理、业务逻辑解析等）来简化现代 Web 应用中的 HTTP 请求。

[![NPM version](https://img.shields.io/npm/v/@wklwyue/fetch.svg?style=flat)](https://www.npmjs.com/package/@wklwyue/fetch)
[![NPM downloads](https://img.shields.io/npm/dm/@wklwyue/fetch.svg?style=flat)](https://www.npmjs.com/package/@wklwyue/fetch)
[![License](https://img.shields.io/npm/l/@wklwyue/fetch.svg)](https://github.com/your-username/your-repo/blob/main/LICENSE)

## ✨ 特性

- **请求防抖**：自动取消在短时间内重复发送的相同请求，防止资源浪费。
- **自动重试**：当请求失败（如网络错误或服务器 5xx 错误）时，可配置自动重试次数和延迟。
- **统一的拦截器**：内置处理 Token、请求错误和响应数据的最佳实践。
- **业务逻辑解析**：自动解析后端返回的 `{ code, data, msg }` 结构，成功时直接返回 `data`，失败时抛出业务异常。
- **高度可配置**：支持通过工厂函数创建实例，几乎所有功能都可自定义。
- **错误消息国际化**：内置中英文错误消息支持。
- **类型安全**：使用 TypeScript 编写，提供强大的类型定义和智能提示。
- **现代 API**：使用 `AbortController` 进行请求取消，与现代 Web 标准保持一致。
- **辅助方法**：提供 `upload` 和 `download` 等便捷的文件处理方法。

## 📦 安装

```bash
npm install @wklwyue/fetch
# or
yarn add @wklwyue/fetch
# or
pnpm add @wklwyue/fetch
```

## 🚀 快速上手

为了应用的健壮性和可维护性，本项目只支持使用 `createHttpRequest` 工厂函数来创建独立的、配置隔离的实例。

```javascript
import { createHttpRequest, BusinessError } from "@wklwyue/fetch";

const http = createHttpRequest({
  baseURL: "[https://api.example.com](https://api.example.com)",
  timeout: 10000, // 10秒超时
  locale: "en", // 错误消息使用英文
  retryTimes: 2, // 失败时重试2次

  // 自定义拦截器
  interceptors: {
    requestSuccess: config => {
      // 在这里可以添加自定义的请求头，例如 tenant-id
      config.headers["X-Tenant-Id"] = "my-tenant";
      return config;
    },
    responseError: error => {
      // 在这里可以进行全局的错误上报
      logErrorToServer(error);
      return Promise.reject(error);
    }
  }
});

// 使用自定义实例
http
  .get("/data")
  .then(data => {
    // ...
  })
  .catch(error => {
    if (error instanceof BusinessError) {
      // 处理业务错误 (例如 code !== 200)
      alert(`业务错误: ${error.message} (错误码: ${error.code})`);
    } else {
      // 处理网络或HTTP错误
      alert(`系统错误: ${error.message}`);
    }
  });
```

## ⚙️ API 参考

### `createHttpRequest(options)`

创建一个 `HttpRequest` 实例。

#### `options` 配置项

| 选项             | 类型                 | 默认值          | 描述                                   |
| :--------------- | :------------------- | :-------------- | :------------------------------------- |
| `baseURL`        | `string`             | `''`            | 请求的基础 URL。                       |
| `timeout`        | `number`             | (axios 默认)    | 请求超时时间（毫秒）。                 |
| `httpConfig`     | `AxiosRequestConfig` | `{}`            | 原生的 Axios 配置对象。                |
| `interceptors`   | `object`             | -               | 自定义请求和响应拦截器。               |
| `responseParser` | `(res) => any`       | (内置解析器)    | 自定义响应数据解析函数。               |
| `debounceTime`   | `number`             | `200`           | 请求防抖的间隔时间（毫秒）。           |
| `retryTimes`     | `number`             | `0`             | 失败请求的自动重试次数。               |
| `retryDelay`     | `number`             | `1000`          | 每次重试之间的延迟（毫秒）。           |
| `retryCondition` | `(err) => boolean`   | (网络错误或5xx) | 一个函数，返回 `true` 则触发重试。     |
| `successCodes`   | `number[]`           | `[200]`         | 定义业务成功的状态码列表。             |
| `locale`         | `'zh' \| 'en'`       | `'zh'`          | 错误消息的语言。                       |
| `debug`          | `boolean`            | `false`         | 是否开启调试模式，会在控制台打印日志。 |

### 实例方法

创建的 `http` 实例拥有所有标准的 Axios 请求方法，并返回一个 `Promise`，该 `Promise` 在业务成功时会 resolve 解析后的 `data`。

- `http.get<T>(url, params?, config?)`
- `http.post<T>(url, data?, config?)`
- `http.put<T>(url, data?, config?)`
- `http.delete<T>(url, params?, config?)`
- `http.patch<T>(url, data?, config?)`
- `http.head<T>(url, params?, config?)`
- `http.options<T>(url, params?, config?)`

#### 辅助方法

- `http.upload<T>(url, file, name?, data?)`: 上传文件。
- `http.download(url, params?, fileName?)`: 下载文件。
- `http.cancelRequest(url?)`: 取消一个或所有待处理的请求。
- `http.setHeaders(headers)`: 动态设置全局请求头。
- `http.setBaseURL(baseURL)`: 动态设置基础 URL。
- `http.setTimeout(timeout)`: 动态设置超时时间。

## 💡 错误处理

本库对错误进行了分类处理，方便您进行精细化控制：

1.  **网络/HTTP 错误**：如网络中断、超时、404、500 等。这些错误会被 `responseError` 拦截器捕获，并默认抛出一个 `Error` 对象。
2.  **业务错误** (`BusinessError`)：请求成功（HTTP 200），但后端返回的业务码 (`code`) 不在 `successCodes` 列表中。默认的 `responseParser` 会抛出一个 `BusinessError` 实例，它包含 `message` 和 `code` 两个属性。

您可以通过 `instanceof BusinessError` 来区分这两种错误类型，如上方案例所示。

## 🤝 贡献

欢迎提交问题 (Issue) 和拉取请求 (Pull Request)。

## 📄 开源许可

[MIT](https://opensource.org/licenses/MIT)
