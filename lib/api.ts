/**
 * 统一的 API 请求获取器，用于 SWR
 */
export const fetcher = (url: string) => fetch(url).then((r) => r.json());
