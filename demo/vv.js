
import { isAbsolute, extname } from "node:path";
import { access } from "node:fs/promises";

const RESOLVE_ENDPOINT = "/__notebook_resolve";

function isExternalUrl(specifier) {
  return /^(?:https?:\/\/|data:|blob:)/i.test(specifier);
}

function isBareSpecifier(specifier) {
  return (
    !specifier.startsWith(".") &&
    !specifier.startsWith("/") &&
    !isAbsolute(specifier) &&
    !isExternalUrl(specifier) &&
    !specifier.startsWith("#")
  );
}

function toBrowserPath(id) {
  // Vite can serve absolute filesystem paths through /@fs/.
  const normalized = id.replace(/\\/g, "/");
  return `/@fs/${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

export default function notebookResolver({
  fallback = "https://esm.sh",
} = {}) {
  let server;

  return {
    name: "notebook-local-package-resolver",
    enforce: "pre",

    configureServer(viteServer) {
      server = viteServer;

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(`${RESOLVE_ENDPOINT}?`)) {
          return next();
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");

        try {
          const requestUrl = new URL(
            req.url,
            "http://localhost",
          );

          const specifier = requestUrl.searchParams.get("specifier");
          const importer = requestUrl.searchParams.get("importer");

          if (!specifier) {
            res.statusCode = 400;
            res.end(JSON.stringify({
              error: "Missing required query parameter: specifier",
            }));
            return;
          }

          // URLs and relative imports do not need package resolution.
          if (!isBareSpecifier(specifier)) {
            res.end(JSON.stringify({
              url: specifier,
              source: "unchanged",
            }));
            return;
          }

          // Resolve the installed package using Vite's resolver.
          const resolved = await server.pluginContainer.resolveId(
            specifier,
            importer || undefined,
          );

          const id =
            typeof resolved === "string"
              ? resolved
              : resolved?.id;

          if (
            id &&
            !id.startsWith("\0") &&
            !id.startsWith("virtual:")
          ) {
            // A filesystem path can be served by Vite's /@fs/ handler.
            const filePath = id.split("?")[0];

            if (isAbsolute(filePath)) {
              try {
                await access(filePath);
                res.end(JSON.stringify({
                  url: toBrowserPath(id),
                  source: "local",
                }));
                return;
              } catch {
                // Continue to the fallback if the path is not a file.
              }
            }
          }

          // Local resolution failed: use the CDN fallback.
          res.end(JSON.stringify({
            url: `${fallback.replace(/\/$/, "")}/${specifier}`,
            source: "cdn",
          }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({
            error: error instanceof Error
              ? error.message
              : String(error),
          }));
        }
      });
    },
  };
}