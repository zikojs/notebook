
import path from "node:path";

const MANIFEST_FILE = "ziko-notebook-imports.json";
const ENDPOINT = "/__notebook_resolve";

function safeName(specifier) {
  return specifier.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function notebookViteResolver({
  packages = [],
  manifestFileName = MANIFEST_FILE,
} = {}) {
  let command;
  let root;
  let base = "/";
  const entries = new Map();

  return {
    name: "ziko-notebook-vite-resolver",

    configResolved(config) {
      command = config.command;
      root = config.root;
      base = config.base;
    },

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

    async buildStart() {
      if (command !== "build") return;

      entries.clear();

      for (const specifier of new Set(packages)) {
        const importer = path.join(root, "__ziko_notebook_resolver__.js");

        try {
          const resolved = await this.resolve(specifier, importer);

          if (!resolved || resolved.external) {
            this.warn(`Notebook package could not be bundled: ${specifier}`);
            continue;
          }

          const referenceId = this.emitFile({
            type: "chunk",
            id: resolved.id,
            name: `notebook-${safeName(specifier)}`,
            preserveSignature: "strict",
          });

          entries.set(specifier, referenceId);
        } catch (error) {
          this.warn(
            `Failed to bundle notebook package "${specifier}": ${error.message}`,
          );
        }
      }
    },

    generateBundle() {
      if (command !== "build") return;

      const imports = {};

      for (const [specifier, referenceId] of entries) {
        const fileName = this.getFileName(referenceId);
        imports[specifier] = `${base}${fileName}`.replace(/([^:]\/)\/+/g, "$1");
      }

      this.emitFile({
        type: "asset",
        fileName: manifestFileName,
        source: JSON.stringify(imports, null, 2),
      });
    },
  };
}
