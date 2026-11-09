export type ApiMethod = "get" | "post" | "delete";

export type ApiEntry = {
  order: number;
  operationId: string;
  method: ApiMethod;
  path: string;
  summary: string;
  description: string;
  server?: string;
  security?: Array<Record<string, string[]>>;
  parameters?: Array<{ name: string; description: string; example: string }>;
  body?: {
    required: string[];
    contentType?: string;
    properties: Record<string, { type: string; enum?: string[]; description: string }>;
    example: Record<string, unknown>;
  };
  successDescription: string;
  successExample: Record<string, unknown>;
};

export const apiCatalog: ApiEntry[] = [
  {
    order: 1,
    operationId: "login",
    method: "post",
    path: "/api/automation/run",
    summary: "측정인 로그인",
    description:
      "측정인 로그인 화면에서 아이디와 비밀번호를 확인하고, 성공하면 공지 페이지를 열어 화면과 그 페이지가 받은 응답을 돌려줍니다. 같은 경로는 이후 조회와 등록을 이어서 담습니다. 브라우저는 https://mycodeisyou.github.io 에서 키 없이 호출할 수 있고, 그 외에는 Authorization Bearer 가 필요합니다.",
    body: {
      required: ["site", "action", "username", "password"],
      properties: {
        site: { type: "string", description: "사이트 아이디. 측정인은 chookjeongin" },
        action: { type: "string", enum: ["login"], description: "로그인" },
        username: { type: "string", description: "측정인 아이디" },
        password: { type: "string", description: "측정인 비밀번호" },
      },
      example: {
        site: "chookjeongin",
        action: "login",
        username: "user@example.com",
        password: "password",
      },
    },
    security: [{ bearerAuth: [] }],
    successDescription: "로그인 성공",
    successExample: {
      ok: true,
      action: "login",
      loggedIn: true,
      message: "로그인되었습니다.",
    },
  },
  {
    order: 2,
    operationId: "notify",
    method: "post",
    path: "/ms/public/notify.do",
    server: "https://www.xn--lu5b7kx8m.kr",
    summary: "측정인 공지",
    description:
      "로그인된 브라우저가 공지 화면의 데이터를 받는 주소입니다. v 는 캐시를 피하려는 시각이고, 로그인 때 생긴 쿠키가 이 요청에 붙습니다. analytics가 이 주소로 따로 폼을 만들어 호출하지는 않고, 1번 로그인 뒤에 페이지가 이 요청을 보내면 그 응답을 기록합니다.",
    parameters: [
      {
        name: "v",
        description: "캐시 방지용 시각. 예: 1794203788541",
        example: "1794203788541",
      },
    ],
    security: [],
    successDescription: "공지 데이터",
    successExample: {},
  },
];

const errorSchema = {
  type: "object",
  properties: {
    ok: { type: "boolean", example: false },
    code: { type: "string" },
    message: { type: "string" },
  },
};

export function openApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const entry of [...apiCatalog].sort((a, b) => a.order - b.order)) {
    const operation: Record<string, unknown> = {
      tags: [`${entry.order}. ${entry.summary}`],
      operationId: entry.operationId,
      summary: `${entry.order}. ${entry.summary}`,
      description: entry.description,
      security: entry.security ?? [{ bearerAuth: [] }],
      ...(entry.server ? { servers: [{ url: entry.server }] } : {}),
      responses: {
        "200": {
          description: entry.successDescription,
          content: {
            "application/json": {
              schema: { type: "object" },
              example: entry.successExample,
            },
          },
        },
        "401": {
          description: "로그인 실패 또는 API 키 불일치",
          content: { "application/json": { schema: errorSchema } },
        },
        "500": {
          description: "처리 중 오류",
          content: { "application/json": { schema: errorSchema } },
        },
      },
    };

    if (entry.parameters) {
      operation.parameters = entry.parameters.map((parameter) => ({
        name: parameter.name,
        in: "query",
        required: true,
        description: parameter.description,
        schema: { type: "string", example: parameter.example },
      }));
    }

    if (entry.body) {
      operation.requestBody = {
        required: true,
        content: {
          [entry.body.contentType ?? "application/json"]: {
            schema: {
              type: "object",
              required: entry.body.required,
              properties: Object.fromEntries(
                Object.entries(entry.body.properties).map(([name, property]) => [
                  name,
                  {
                    type: property.type,
                    description: property.description,
                    ...(property.enum ? { enum: property.enum } : {}),
                  },
                ]),
              ),
              example: entry.body.example,
            },
          },
        },
      };
    }

    const current = paths[entry.path] ?? {};
    current[entry.method] = operation;
    paths[entry.path] = current;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "analytics",
      version: "0.1.0",
      description: "자동화 API 목록입니다. 1번부터 순서대로 추가합니다.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "AUTOMATION_API_KEY. 허용된 화면 주소에서는 생략할 수 있습니다.",
        },
      },
    },
    paths,
  };
}
