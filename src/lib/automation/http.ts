import { NextResponse } from "next/server";
import { AutomationError } from "./errors";

export function authorize(request: Request): NextResponse | null {
  const configured = process.env.AUTOMATION_API_KEY?.trim();
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (configured) {
    if (token !== configured) {
      return NextResponse.json(
        { ok: false, code: "unauthorized", message: "API 키가 올바르지 않습니다." },
        { status: 401 },
      );
    }
    return null;
  }

  const host = request.headers.get("host") ?? "";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
  if (!local) {
    return NextResponse.json(
      { ok: false, code: "unauthorized", message: "AUTOMATION_API_KEY 를 설정해야 합니다." },
      { status: 401 },
    );
  }
  return null;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new AutomationError("invalid_body", "JSON 객체를 보내 주세요.");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AutomationError) throw error;
    throw new AutomationError("invalid_body", "JSON 형식이 아닙니다.");
  }
}

export function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AutomationError("invalid_body", `${field} 는 객체여야 합니다.`);
  }
  return value as Record<string, unknown>;
}

export function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AutomationError("invalid_body", `${field} 를 입력해 주세요.`);
  }
  return value.trim();
}

export async function run(action: () => Promise<Record<string, unknown>>) {
  try {
    return NextResponse.json({ ok: true, ...(await action()) });
  } catch (error) {
    if (error instanceof AutomationError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { ok: false, code: "internal", message: "처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
