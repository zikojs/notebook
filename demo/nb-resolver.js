
import { isAbsolute, join } from "node:path";
import { stat } from "node:fs/promises";

const ENDPOINT = "/__notebook_resolve";

function isBareSpecifier(source) {
  return (
    !source.startsWith(".") &&
    !source.startsWith("/") &&
    !source.startsWith("#") &&
    !/^(?:https?:\/\/|data:|blob:)/i.test(source)
  );
}

function toViteUrl(id) {
  const normalized = id.replace(/\\/g, "/");

  return normalized.startsWith("/")
    ? `/@fs${normalized}`
    : `/@fs/${normalized}`;
}

export default function notebookResolver({
  fallback = "https://esm.sh",
} = {}) {
  let server;

  return {
    name: "notebook-resolver",
    enforce: "pre",

    configureServer(viteServer) {
      server = viteServer;

      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        const requestUrl = new URL(
          req.url,
          "http://localhost",
        );

        if (requestUrl.pathname !== ENDPOINT) {
          return next();
        }

        res.setHeader(
          "Content-Type",
          "application/json; charset=utf-8",
        );
        res.setHeader("Cache-Control", "no-store");

        const send = (status, data) => {
          res.statusCode = status;
          res.end(JSON.stringify(data));
        };

        const specifier =
          requestUrl.searchParams.get("specifier");

        const importer =
          requestUrl.searchParams.get("importer");

        if (!specifier) {
          return send(400, {
            error: "Missing specifier",
          });
        }

        if (!isBareSpecifier(specifier)) {
          return send(200, {
            url: specifier,
            source: "unchanged",
          });
        }

        try {
          const resolved =
            await server.pluginContainer.resolveId(
              specifier,
              importer || join(
                server.config.root,
                "__notebook_resolver__.js",
              ),
            );

          const id =
            typeof resolved === "string"
              ? resolved
              : resolved?.id;

          if (
            id &&
            !resolved?.external &&
            !id.startsWith("\0") &&
            !id.startsWith("virtual:")
          ) {
            const filePath = id.split("?")[0];

            if (isAbsolute(filePath)) {
              try {
                const info = await stat(filePath);

                if (info.isFile()) {
                  return send(200, {
                    url: toViteUrl(id),
                    source: "local",
                  });
                }
              } catch {
                // Try the CDN when the resolved file is unavailable.
              }
            }
          }
        } catch {
          // A package that Vite cannot resolve can use the CDN.
        }

        return send(200, {
          url: `${fallback.replace(/\/$/, "")}/${specifier}`,
          source: "cdn",
        });
      });
    },
  };
}