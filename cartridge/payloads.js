function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToBase64(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return `${normalized}${padding}`;
}

function base64ToBase64Url(value) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const bytes = base64ToBytes(base64UrlToBase64(value));
  return new TextDecoder().decode(bytes);
}

function decodeBase64Payload(value) {
  const bytes = base64ToBytes(value.replace(/\s+/g, ""));
  return new TextDecoder().decode(bytes);
}

function decodeDataUrl(value) {
  const comma = value.indexOf(",");
  if (comma === -1) return value;
  const meta = value.slice(0, comma).toLowerCase();
  const body = value.slice(comma + 1);
  if (meta.includes(";base64")) return decodeBase64Payload(body);
  return decodeURIComponent(body);
}

function decodeUrlHash(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("#cart=")) {
    return decodeURIComponent(trimmed.slice("#cart=".length));
  }

  try {
    const url = new URL(trimmed);
    const hash = url.hash || "";
    if (hash.startsWith("#cart=")) {
      return decodeURIComponent(hash.slice("#cart=".length));
    }
  } catch (error) {
    return "";
  }
  return "";
}

export function encodeCartPayload(payload) {
  const bytes = new TextEncoder().encode(payload);
  return `cart:v1:base64url:${base64ToBase64Url(bytesToBase64(bytes))}`;
}

export function parseCartridgeInput(raw) {
  const value = String(raw || "").trim();
  if (!value) return { payload: "", source: "empty" };

  if (value.startsWith("cart:v1:base64url:")) {
    return {
      payload: decodeBase64Url(value.slice("cart:v1:base64url:".length)),
      source: "cart-v1",
    };
  }

  if (value.startsWith("cart:v1:b64:")) {
    return {
      payload: decodeBase64Payload(value.slice("cart:v1:b64:".length)),
      source: "cart-v1",
    };
  }

  const hashPayload = decodeUrlHash(value);
  if (hashPayload) {
    return { payload: hashPayload, source: "url-hash" };
  }

  if (/^data:text\/html/i.test(value)) {
    return { payload: decodeDataUrl(value), source: "data-url" };
  }

  if (
    /^[A-Za-z0-9+/=\s]+$/.test(value) &&
    value.length % 4 === 0 &&
    !value.includes("<")
  ) {
    try {
      const decoded = decodeBase64Payload(value);
      if (decoded.trim().startsWith("<"))
        return { payload: decoded, source: "base64" };
    } catch (error) {
      return { payload: value, source: "text" };
    }
  }

  if (value.startsWith("<")) return { payload: value, source: "raw-html" };
  return { payload: value, source: "text" };
}
