import { apiCatalog } from "@/lib/automation/catalog";

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px", lineHeight: 1.6 }}>
      <h1>analytics</h1>
      <p>다른 사이트에 로그인하고 조회·등록하는 Playwright 백엔드입니다.</p>
      <p>
        <a href="/docs">API 목록 (Swagger)</a>
      </p>
      <ol>
        {apiCatalog.map((entry) => (
          <li key={entry.operationId}>
            <code>
              {entry.method.toUpperCase()} {entry.path}
            </code>
            <span> — {entry.summary}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
