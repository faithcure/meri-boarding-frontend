import { NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/lib/apiBaseUrl";
import { fetchSiteIconUrl } from "@/lib/siteSettingsApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  const fallbackUrl = new URL("/icon.svg", request.url);

  try {
    const siteIconUrl = await fetchSiteIconUrl();
    const fetchableUrl = toFetchableUrl(siteIconUrl);
    if (!fetchableUrl) {
      return NextResponse.redirect(fallbackUrl);
    }

    const response = await fetch(fetchableUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch site icon (${response.status})`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = String(response.headers.get("content-type") || "image/x-icon").trim() || "image/x-icon";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.redirect(fallbackUrl);
  }
}
