// index.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHttpRequest } from "../src/index";

const http = createHttpRequest({
  baseURL: "https://api.example.com",
  locale: "zh"
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("HttpRequest with vi mock", () => {
  it("GET 请求 mock", async () => {
    vi.spyOn(http, "get").mockResolvedValue({ id: "123", name: "wklwyue" });
    await expect(http.get("/user")).resolves.toEqual({ id: "123", name: "wklwyue" });
  });

  it("POST 请求 mock", async () => {
    vi.spyOn(http, "post").mockResolvedValue({ success: true });
    await expect(http.post("/user", { name: "wklwyue" })).resolves.toEqual({ success: true });
  });

  it("PUT 请求 mock", async () => {
    vi.spyOn(http, "put").mockResolvedValue({ updated: true });
    await expect(http.put("/user/123", { name: "newname" })).resolves.toEqual({ updated: true });
  });

  it("DELETE 请求 mock", async () => {
    vi.spyOn(http, "delete").mockResolvedValue({ deleted: true });
    await expect(http.delete("/user/123")).resolves.toEqual({ deleted: true });
  });

  it("PATCH 请求 mock", async () => {
    vi.spyOn(http, "patch").mockResolvedValue({ patched: true });
    await expect(http.patch("/user/123", { name: "patchname" })).resolves.toEqual({ patched: true });
  });

  it("HEAD 请求 mock", async () => {
    vi.spyOn(http, "head").mockResolvedValue({});
    await expect(http.head("/user")).resolves.toEqual({});
  });

  it("OPTIONS 请求 mock", async () => {
    vi.spyOn(http, "options").mockResolvedValue({});
    await expect(http.options("/user")).resolves.toEqual({});
  });

  it("上传文件 mock", async () => {
    vi.spyOn(http, "upload").mockResolvedValue({ uploaded: true });
    const file = new File(["content"], "test.txt");
    await expect(http.upload("/upload", file, "file", { extra: "data" })).resolves.toEqual({ uploaded: true });
  });

  it("下载文件 mock", async () => {
    vi.spyOn(http, "get").mockResolvedValue(new Blob(["file content"]));
    await expect(http.get("/download", { responseType: "blob" })).resolves.toBeInstanceOf(Blob);
  });

  it("业务错误 mock", async () => {
    vi.spyOn(http, "get").mockRejectedValue(new Error("Bad Request"));
    console.log(expect(http.get("/error")));
    await expect(http.get("/error")).rejects.toThrow("Bad Request");
  });

  it("404 错误 mock", async () => {
    vi.spyOn(http, "get").mockRejectedValue(new Error("请求的资源不存在"));
    await expect(http.get("/notfound")).rejects.toThrow("请求的资源不存在");
  });

  it("401 错误 mock", async () => {
    const customHttp = createHttpRequest({ baseURL: "https://api.example.com", locale: "en" });
    vi.spyOn(customHttp, "get").mockRejectedValue(new Error("Unauthorized, please log in again"));
    await expect(customHttp.get("/unauthorized")).rejects.toThrow("Unauthorized, please log in again");
  });

  it("网络错误 mock", async () => {
    vi.spyOn(http, "get").mockRejectedValue(new Error("网络错误，请检查网络连接"));
    await expect(http.get("/network")).rejects.toThrow("网络错误，请检查网络连接");
  });

  it("重试逻辑 mock", async () => {
    const customHttp = createHttpRequest({ baseURL: "https://api.example.com", retryTimes: 1 });
    const spy = vi.spyOn((customHttp as any).instance, "request");
    spy
      .mockRejectedValueOnce(new Error()) // 第一次 request
      .mockResolvedValueOnce({ data: { id: "123", name: "retry" } }); // 第二次 request

    // 第一次应该抛出网络错误，第二次才返回正常数据
    try {
      const result = await customHttp.get("/user");
      expect(result).toEqual({ id: "123", name: "retry" });
      expect(spy).toHaveBeenCalledTimes(2);
    } catch (err) {
      expect((err as Error).message).toBe("网络错误，请检查网络连接");
    }
  });

  it("取消请求 mock", async () => {
    vi.spyOn(http, "cancelRequest").mockImplementation(() => {});
    expect(() => http.cancelRequest()).not.toThrow();
  });

  it("超时请求 mock", async () => {
    const customHttp = createHttpRequest({ baseURL: "https://api.example.com", timeout: 1 });
    const mockError = new Error("timeout of 1000ms exceeded") as any;
    mockError.code = "ECONNABORTED";
    mockError.isAxiosError = true;
    mockError.config = { timeout: 1 };
    vi.spyOn((customHttp as any).instance, "request").mockRejectedValue(mockError);

    await expect(customHttp.get("/timeout")).rejects.toThrow("请求超时，请稍后重试");
  });
});
