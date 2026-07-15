import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// The app's own directory — Hermes edits files in here, and Undo restores them.
const ROOT = process.cwd();

// Resolve a (possibly relative or absolute) path from a tool call to an
// absolute path, refusing anything that escapes the app directory.
function resolveSafe(p: string): string | null {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  const norm = path.normalize(abs);
  if (norm !== ROOT && !norm.startsWith(ROOT + path.sep)) return null;
  return norm;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path");
  const file = resolveSafe(p ?? "");
  if (!file) return NextResponse.json({ error: "bad path" }, { status: 400 });
  try {
    const content = await fs.readFile(file, "utf8");
    return NextResponse.json({ path: p, content });
  } catch (e) {
    // Missing file is a valid answer (content: null) — used for undo-of-create.
    return NextResponse.json({ path: p, content: null, error: String(e) });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { path?: string; content?: string };
  const file = resolveSafe(body.path ?? "");
  if (!file) return NextResponse.json({ error: "bad path" }, { status: 400 });
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  await fs.writeFile(file, body.content, "utf8");
  return NextResponse.json({ ok: true, path: body.path, bytes: body.content.length });
}
