export const resolveImport = (source, importMapConfig = {}) => {
  if (importMapConfig[source]) {
    return importMapConfig[source];
  }

  if (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("./") ||
    source.startsWith("../")
  ) {
    return source;
  }

  return `https://esm.sh/${source}`;
};

export const rewriteImportNode = (
  node,
  code,
  importMapConfig,
) => {
  const source = resolveImport(
    node.source.value,
    importMapConfig,
  );

  if (node.specifiers.length === 0) {
    return `await import("${source}");`;
  }

  let defaultImportName = null;
  let namespaceId = null;
  const namedImports = [];

  node.specifiers.forEach((spec) => {
    if (spec.type === "ImportNamespaceSpecifier") {
      namespaceId = spec.local.name;
    } else if (spec.type === "ImportDefaultSpecifier") {
      defaultImportName = spec.local.name;
    } else if (spec.type === "ImportSpecifier") {
      namedImports.push({
        imported: spec.imported.name,
        local: spec.local.name,
      });
    }
  });

  if (namespaceId) {
    return `__scope__.${namespaceId} = await import("${source}");`;
  }

  const tmp = `__mod_${node.start}`;

  const lines = [
    `const ${tmp} = await import("${source}");`,
  ];

  if (defaultImportName) {
    lines.push(
      `__scope__.${defaultImportName} = ` +
      `${tmp}.default ?? ${tmp};`,
    );
  }

  namedImports.forEach(({ imported, local }) => {
    lines.push(
      `__scope__.${local} = ` +
      `${tmp}.${imported} !== undefined ` +
      `? ${tmp}.${imported} ` +
      `: (${tmp}.default ?? ${tmp});`,
    );
  });

  return lines.join("\n");
};