import { NextRequest, NextResponse } from "next/server";
import { queryIcons } from "@/lib/icons-db";
import { ICON_PAGE_SIZE } from "@/lib/icons";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const lib = sp.get("lib") ?? "";
  const style = sp.get("style") ?? "";

  try {
    const result = await queryIcons({
      q,
      page,
      pageSize: ICON_PAGE_SIZE,
      lib: lib || undefined,
      style: style || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("icons API error", err);
    return NextResponse.json({ error: "Failed to query icons" }, { status: 500 });
  }
}
