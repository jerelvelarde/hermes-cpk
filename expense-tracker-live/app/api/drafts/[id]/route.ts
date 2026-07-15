import { promises as fs } from "node:fs";
import * as path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const dataFile = path.join(process.cwd(), "data", "drafts.json");

const readDrafts = async (): Promise<Record<string, { id: string; assets: unknown[] }>> => {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    return JSON.parse(raw) as Record<string, { id: string; assets: unknown[] }>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
};

const writeDrafts = async (drafts: Record<string, { id: string; assets: unknown[] }>) => {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(drafts, null, 2)}\n`, "utf8");
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const drafts = await readDrafts();
  const draft = drafts[id] ?? { id, assets: [] };
  return NextResponse.json(draft);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { asset?: unknown; assets?: unknown[] };

  if (!body.asset && !body.assets?.length) {
    return NextResponse.json(
      { error: 'Expected JSON body with an "asset" object or non-empty "assets" array.' },
      { status: 400 },
    );
  }

  const drafts = await readDrafts();
  const existing = drafts[id] ?? { id, assets: [] };
  const assetsToAppend = body.asset ? [body.asset] : body.assets ?? [];
  const updated = {
    ...existing,
    assets: [...existing.assets, ...assetsToAppend],
  };

  drafts[id] = updated;
  await writeDrafts(drafts);

  return NextResponse.json(updated);
}
