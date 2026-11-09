import { openApiDocument } from "@/lib/automation/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(openApiDocument());
}
