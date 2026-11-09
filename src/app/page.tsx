const endpoints = [
  ["GET", "/api/health", "서버 상태"],
  ["GET", "/api/automation/sites", "등록된 사이트와 동작 목록"],
  ["POST", "/api/automation/sessions", "브라우저 세션 열기. body: { site }"],
  ["GET", "/api/automation/sessions/:id", "세션 상태"],
  ["DELETE", "/api/automation/sessions/:id", "세션 종료"],
  ["POST", "/api/automation/sessions/:id/login", "로그인. body: { username, password }"],
  ["POST", "/api/automation/sessions/:id/query", "조회. body: { operation, input }"],
  ["POST", "/api/automation/sessions/:id/register", "등록. body: { operation, input }"],
];

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px", lineHeight: 1.6 }}>
      <h1>analytics</h1>
      <p>다른 사이트에 로그인하고 조회·등록하는 Playwright 백엔드입니다.</p>
      <ul>
        {endpoints.map(([method, path, description]) => (
          <li key={path}>
            <code>
              {method} {path}
            </code>
            <span> — {description}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
