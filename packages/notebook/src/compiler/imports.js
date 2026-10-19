
const CDN = "https://esm.sh/";
const MANIFEST_FILE = "ziko-notebook-imports.json";
const isProductionBuild =
  typeof import.meta.env !== "undefined" && import.meta.env.PROD;

let buildImportMapPromise;

const loadBuildImportMap = () => {
  if (!isProductionBuild || typeof document === "undefined") {
    return Promise.resolve({});
  }

  if (!buildImportMapPromise) {
    const manifestUrl = new URL(MANIFEST_FILE, document.baseURI);

    buildImportMapPromise = fetch(manifestUrl).then(async (response) => {
      if (response.status === 404) {
        return {};
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load the notebook import map: ${response.status} ${response.statusText}`,
        );
      }

      const imports = await response.json();

      if (!imports || typeof imports !== "object" || Array.isArray(imports)) {
        throw new TypeError("The notebook import map must be a JSON object.");
      }

      return imports;
    });
  }

  return buildImportMapPromise;
};

const isURL = (source) =>
  /^(?:https?:\/\/|data:|blob:)/i.test(source);

const isBareSpecifier = (source) =>
  !source.startsWith(".") &&
  !source.startsWith("/") &&
  !source.startsWith("#") &&
  !isURL(source);

export const resolveImport = async (
  source,
  {
    importMap = {},
    plugins = [],
    resolverEndpoint = "/__notebook_resolve",
    cdnFallback = true,
  } = {},
) => {
  // Preserve explicit mappings, including package subpaths.
  if (importMap[source]) {
    return importMap[source];
  }

  if (!isBareSpecifier(source)) {
    return source;
  }

  // Preserve runtime-specific and custom resolution hooks.
  for (const plugin of plugins) {
    if (typeof plugin.resolveImport !== "function") {
      continue;
    }

    const resolved = await plugin.resolveImport(source);

    if (typeof resolved === "string" && resolved) {
      return resolved;
    }
  }

  const buildImportMap = await loadBuildImportMap();

  if (typeof buildImportMap[source] === "string") {
    return buildImportMap[source];
  }

  // Ask the host dev server to resolve installed packages.
  try {
    const params = new URLSearchParams({
      specifier: source,
    });

    const response = await fetch(
      `${resolverEndpoint}?${params.toString()}`,
    );

    if (response.ok) {
      const result = await response.json();

      if (typeof result.url === "string" && result.url) {
        return result.url;
      }
    }
  } catch {
    // The Vite endpoint may not be available outside development.
  }

  if (cdnFallback) {
    return `${CDN}${source}`;
  }

  throw new Error(
    `Cannot resolve "${source}" locally. ` +
    `Install the package or provide an importMap entry. ` +
    `CDN fallback is disabled.`,
  );
};

// Keep your existing rewriteImportNode implementation below.

export const rewriteImportNode = async (
  node,
  code,
  context,
) => {
  const source = await resolveImport(
    node.source.value,
    context,
  );

  // Safely quote the URL in generated JavaScript.
  const url = JSON.stringify(source);

  if (node.specifiers.length === 0) {
    return `await import(${url});`;
  }

  let defaultImportName = null;
  let namespaceId = null;
  const namedImports = [];

  for (const spec of node.specifiers) {
    if (spec.type === "ImportNamespaceSpecifier") {
      namespaceId = spec.local.name;
    } else if (spec.type === "ImportDefaultSpecifier") {
      defaultImportName = spec.local.name;
    } else if (spec.type === "ImportSpecifier") {
      namedImports.push({
        imported:
          spec.imported.name ?? spec.imported.value,
        local: spec.local.name,
      });
    }
  }

  if (namespaceId) {
    return (
      `__scope__.${namespaceId} = ` +
      `await import(${url});`
    );
  }

  const tmp = `__mod_${node.start}`;

  const lines = [
    `const ${tmp} = await import(${url});`,
  ];

  if (defaultImportName) {
    lines.push(
      `__scope__.${defaultImportName} = ` +
      `${tmp}.default ?? ${tmp};`,
    );
  }

  for (const { imported, local } of namedImports) {
    lines.push(
      `__scope__.${local} = ` +
      `${tmp}[${JSON.stringify(imported)}] !== undefined ` +
      `? ${tmp}[${JSON.stringify(imported)}] ` +
      `: (${tmp}.default ?? ${tmp});`,
    );
  }

  return lines.join("\n");
};