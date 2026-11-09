import { authorize, asString, readJson, run } from "@/lib/automation/http";
import { getSite } from "@/lib/automation/registry";
import { sessionSummary, touchSession } from "@/lib/automation/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await context.params;

  return run(async () => {
    const body = await readJson(request);
    const session = touchSession(id);
    const site = getSite(session.site);
    const result = await site.login(session.page, {
      username: asString(body.username, "username"),
      password: asString(body.password, "password"),
    });
    session.loggedIn = result.ok;
    return { ...sessionSummary(session), ...result };
  });
}
