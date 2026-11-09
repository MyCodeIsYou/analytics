import { authorize, readJson, run } from "@/lib/automation/http";
import { runJob } from "@/lib/automation/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  return run(async () => {
    const body = await readJson(request);
    return runJob(body);
  });
}
