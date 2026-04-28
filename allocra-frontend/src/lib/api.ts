// Backwards-compat shim — canonical client lives in src/api/client.ts
import api, { setupInterceptors as _setupInterceptors, type GetTokenFn } from "@/api/client";
import { safeArray as _safeArray } from "@/api/helpers";

export const setupInterceptors = _setupInterceptors;
export const safeArray = _safeArray;
export type { GetTokenFn };
export default api;
