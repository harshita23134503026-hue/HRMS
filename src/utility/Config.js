// Provide sensible defaults so the app still works during local dev
const defaultApiBase = "http://127.0.0.1:7000/api";

const trimTrailingSlash = (url) => (url || "").replace(/\/+$/, "");
const ensureApiSuffix = (url) => {
	const clean = trimTrailingSlash(url);
	return clean.endsWith("/api") ? clean : `${clean}/api`;
};
const stripApiSuffix = (url) => trimTrailingSlash(url).replace(/\/api$/, "");

const rawApiBase = import.meta.env.VITE_API_BASE_URL || defaultApiBase;
const rawChatBase = import.meta.env.VITE_CHAT_API_BASE_URL || rawApiBase;

// REST endpoints are built like `${BASE_URL}/auth/login`.
export const BASE_URL = ensureApiSuffix(rawApiBase);
// Chat and socket code append `/api/*` themselves, so keep this as origin only.
export const CHAT_BASE_URL = stripApiSuffix(rawChatBase);