"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import "./docs.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsUi() {
  return (
    <div className="docs-root">
      <SwaggerUI url="/api/openapi" docExpansion="full" defaultModelsExpandDepth={1} />
    </div>
  );
}
