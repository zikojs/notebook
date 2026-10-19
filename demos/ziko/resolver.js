
import path from "node:path";

const ENDPOINT = "/__notebook_resolve";

export function notebookViteResolver() {
  return {
    name: "ziko-notebook-vite-resolver",
    apply: "serve",

    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");

        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const requestUrl = new URL(
            req.url || "/",
            "http://localhost",
          );

          const specifier = requestUrl.searchParams.get("specifier");

          if (
            !specifier ||
            specifier.startsWith(".") ||
            specifier.startsWith("/") ||
            specifier.startsWith("#") ||
            /^(?:https?:|data:|blob:)/i.test(specifier)
          ) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid package specifier" }));
            return;
          }

          // Resolve relative to the Vite project, not the notebook package.
          const importer = path.join(
            server.config.root,
            "__ziko_notebook_resolver__.js",
          );

          const resolved = await server.pluginContainer.resolveId(
            specifier,
            importer,
          );

          if (
            !resolved ||
            resolved.external ||
            resolved.id.startsWith("\0") ||
            resolved.id.startsWith("virtual:")
          ) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Local package not found" }));
            return;
          }

          // Let Vite serve and transform the resolved source file.
          const [file, ...queryParts] = resolved.id.split("?");
          const query = queryParts.length
            ? `?${queryParts.join("?")}`
            : "";

          if (!path.isAbsolute(file)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not a local file module" }));
            return;
          }

          const url = server.resolvedUrls
                ? `/@fs/${file.replace(/\\/g, "/")}${query}`
                : `/@fs/${file.replace(/\\/g, "/")}${query}`;

          res.statusCode = 200;
          res.end(JSON.stringify({ url }));
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Local resolution failed" }));
        }
      });
    },
  };
}
