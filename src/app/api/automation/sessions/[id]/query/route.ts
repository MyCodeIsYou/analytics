import { asRecord, asString, authorize, readJson, run } from "@/lib/automation/http";
import { runQuery } from "@/lib/automation/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await context.params;

  return run(async () => {
    const body = await readJson(request);
    const input = body.input === undefined ? {} : asRecord(body.input, "input");
    return runQuery(id, asString(body.operation, "operation"), input);
  });
}
