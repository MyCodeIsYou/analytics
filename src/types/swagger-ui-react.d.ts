declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  const SwaggerUI: ComponentType<{
    url: string;
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
  }>;

  export default SwaggerUI;
}
