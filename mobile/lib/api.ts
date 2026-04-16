import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.162:3000";
const COOKIE_KEY = "session_cookie";

export async function getStoredCookie(): Promise<string | null> {
  return AsyncStorage.getItem(COOKIE_KEY);
}

export async function storeSessionFromResponse(headers: Headers): Promise<void> {
  const setCookie = headers.get("set-cookie");
  if (!setCookie) return;
  const match = setCookie.match(/session=([^;]+)/);
  if (match) {
    await AsyncStorage.setItem(COOKIE_KEY, match[1]);
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(COOKIE_KEY);
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const cookie = await getStoredCookie();
  return {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: `session=${cookie}` } : {}),
    ...extra,
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<{ data: T; headers: Headers }> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur serveur" }));
    throw new Error(err.error || `POST ${path} failed`);
  }
  const data = await res.json();
  return { data, headers: res.headers };
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}
