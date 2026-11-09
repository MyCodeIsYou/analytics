import { authorize, asString, readJson, run } from "@/lib/automation/http";
import { openSession, sessionSummary } from "@/lib/automation/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  return run(async () => {
    const body = await readJson(request);
    const session = await openSession(asString(body.site, "site"));
    return sessionSummary(session);
  });
}
