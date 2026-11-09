import { authorize, run } from "@/lib/automation/http";
import { closeSession, sessionSummary, touchSession } from "@/lib/automation/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await context.params;
  return run(async () => sessionSummary(touchSession(id)));
}

export async function DELETE(request: Request, context: Context) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await context.params;
  return run(async () => {
    const closed = await closeSession(id);
    return { closed };
  });
}
