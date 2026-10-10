
const CDN = "https://esm.sh/";

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
  } = {},
) => {
  if (importMap[source]) {
    return importMap[source];
  }

  if (!isBareSpecifier(source)) {
    return source;
  }

  for (const plugin of plugins) {
    if (typeof plugin.resolveImport !== "function") {
      continue;
    }

    const resolved = await plugin.resolveImport(source);

    if (typeof resolved === "string" && resolved) {
      return resolved;
    }
  }

  try {
    const params = new URLSearchParams({ specifier: source });

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

  return `${CDN}${source}`;
};

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