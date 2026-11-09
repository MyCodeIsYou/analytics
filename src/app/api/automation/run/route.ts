import { NextResponse } from "next/server";
import { applyCors, authorize, readJson, run } from "@/lib/automation/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS(request: Request) {
  return applyCors(request, new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return applyCors(request, denied);
  const response = await run(async () => {
    const { runJob } = await import("@/lib/automation/actions");
    const body = await readJson(request);
    return runJob(body);
  });
  return applyCors(request, response);
}
