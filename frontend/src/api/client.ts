import type { ApiErrorBody } from "../types/api";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiClientError extends Error {
  body: ApiErrorBody;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiClientError";
    this.body = body;
  }
}

export function apiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export async function requestJson<TResponse>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers
      }
    });
    const text = await response.text();
    const body = text ? parseJson(text) : null;
    if (!response.ok) {
      throw new ApiClientError(normalizeError(response.status, body));
    }
    return body as TResponse;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError({ status: 0, code: "TIMEOUT", message: "后端请求超时" });
    }
    throw new ApiClientError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "后端未连接，无法执行路径计算",
      details: error
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function normalizeError(status: number, body: unknown): ApiErrorBody {
  if (isErrorEnvelope(body)) {
    return {
      status,
      code: String(body.error.code),
      message: String(body.error.message),
      details: body.error
    };
  }
  if (isFastApiValidationError(body)) {
    return {
      status,
      code: "VALIDATION_ERROR",
      message: "场景或请求数据未通过后端校验",
      details: body.detail
    };
  }
  if (status === 404) return { status, code: "NOT_FOUND", message: "请求的资源不存在", details: body };
  if (status === 409) return { status, code: "CONFLICT", message: "当前步骤顺序不允许执行该操作", details: body };
  if (status === 422) return { status, code: "UNPROCESSABLE_ENTITY", message: "场景验证失败", details: body };
  return { status, code: "SERVER_ERROR", message: "后端服务返回错误", details: body };
}

function isErrorEnvelope(value: unknown): value is { error: { code: unknown; message: unknown } } {
  return typeof value === "object" && value !== null && "error" in value;
}

function isFastApiValidationError(value: unknown): value is { detail: unknown } {
  return typeof value === "object" && value !== null && "detail" in value;
}
