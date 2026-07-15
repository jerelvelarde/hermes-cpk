import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Serves a PDF that lives inside the app directory (e.g. a report Hermes
// generated) as a binary stream, so the inline PdfViewer can embed it.
const ROOT = process.cwd();

function resolveSafe(p: string): string | null {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  const norm = path.normalize(abs);
  if (norm !== ROOT && !norm.startsWith(ROOT + path.sep)) return null;
  if (!norm.toLowerCase().endsWith(".pdf")) return null;
  return norm;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path");
  const file = resolveSafe(p ?? "");
  if (!file) return NextResponse.json({ error: "bad path" }, { status: 400 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${path.basename(file)}"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
