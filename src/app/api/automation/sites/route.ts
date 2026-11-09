import { authorize } from "@/lib/automation/http";
import { listSites } from "@/lib/automation/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  return Response.json({ ok: true, sites: listSites() });
}
