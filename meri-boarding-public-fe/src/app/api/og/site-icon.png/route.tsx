import { ImageResponse } from "next/og";
import { getServerApiBaseUrl } from "@/lib/apiBaseUrl";
import { fetchSiteIconUrl } from "@/lib/siteSettingsApi";

export const runtime = "nodejs";

function toFetchableUrl(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/api/")) {
    return `${getServerApiBaseUrl()}${value}`;
  }
  if (value.startsWith("/")) {
    const port = String(process.env.PORT || "3000").trim() || "3000";
    return `http://127.0.0.1:${port}${value}`;
  }
  return "";
}

async function loadIconDataUrl() {
  const siteIconUrl = await fetchSiteIconUrl();
  const fetchableUrl = toFetchableUrl(siteIconUrl);

  if (!fetchableUrl) return null;

  try {
    const response = await fetch(fetchableUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch icon (${response.status})`);
    }

    const contentType = String(response.headers.get("content-type") || "image/png").trim() || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length) return null;

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const iconDataUrl = await loadIconDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #5f5146 0%, #7b6a5d 45%, #9b897c 100%)",
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 72,
            background: "rgba(255,255,255,0.08)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.2)",
            padding: 48,
          }}
        >
          {iconDataUrl ? (
            <img
              src={iconDataUrl}
              alt="Meri Boarding site icon"
              width={224}
              height={224}
              style={{
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              style={{
                color: "#ffffff",
                fontSize: 160,
                fontWeight: 700,
                lineHeight: 1,
                display: "flex",
              }}
            >
              M
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
