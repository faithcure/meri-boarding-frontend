const DEFAULT_SITE_URL = "https://meri-boarding.de";

function normalizeAbsoluteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("/")) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function getSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    DEFAULT_SITE_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAbsoluteUrl(String(candidate || ""));
    if (normalized) return normalized;
  }

  return DEFAULT_SITE_URL;
}
