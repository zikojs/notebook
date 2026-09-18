import van from "vanjs-core";
import * as acorn from "acorn";

export const rewriteImportNode = (node, code, importMapConfig) => {
  let source = node.source.value;
  if (importMapConfig && importMapConfig[source]) {
    source = importMapConfig[source];
  } else if (!source.startsWith("http://") && !source.startsWith("https://") && !source.startsWith("./") && !source.startsWith("../")) {
    source = `https://esm.sh/${source}`;
  }

  if (node.specifiers.length === 0) return `await import("${source}");`;

  let defaultImportName = null;
  let namespaceId = null;
  let namedImports = [];

  node.specifiers.forEach(spec => {
    if (spec.type === "ImportNamespaceSpecifier") namespaceId = spec.local.name;
    else if (spec.type === "ImportDefaultSpecifier") defaultImportName = spec.local.name;
    else if (spec.type === "ImportSpecifier") namedImports.push({ imported: spec.imported.name, local: spec.local.name });
  });

  if (namespaceId) return `window.__notebook_scope.${namespaceId} = await import("${source}");`;

  const tmp = `__mod_${node.start}`;
  let lines = [`const ${tmp} = await import("${source}");`];

  if (defaultImportName && namedImports.length === 0) {
    lines.push(`window.__notebook_scope.${defaultImportName} = ${tmp}.default ?? ${tmp};`);
    return lines.join("\n");
  }

  if (defaultImportName) lines.push(`window.__notebook_scope.${defaultImportName} = ${tmp}.default ?? ${tmp};`);
  namedImports.forEach(({ imported, local }) => {
    lines.push(`window.__notebook_scope.${local} = ${tmp}.${imported} !== undefined ? ${tmp}.${imported} : (${tmp}.default ?? ${tmp});`);
  });

  return lines.join("\n");
};

export const transformImportsAndScope = (code, importMapConfig) => {
  try {
    const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true });
    let modifications = [];

    ast.body.forEach(node => {
      if (node.type === "ImportDeclaration") {
        modifications.push({ start: node.start, end: node.end, replacement: rewriteImportNode(node, code, importMapConfig) });
      } else if (node.type === "VariableDeclaration") {
        let replacementCode = "";
        node.declarations.forEach(decl => {
          if (decl.id.type === "Identifier") {
            const varName = decl.id.name;
            const initCode = decl.init ? code.slice(decl.init.start, decl.init.end) : "undefined";
            replacementCode += `window.__notebook_scope.${varName} = ${initCode};\n`;
          } else if (decl.id.type === "ObjectPattern") {
            const initCode = decl.init ? code.slice(decl.init.start, decl.init.end) : "undefined";
            const tempVar = `__destruct_obj_${decl.start}`;
            replacementCode += `(() => { const ${tempVar} = ${initCode}; `;
            decl.id.properties.forEach(prop => {
              if (prop.value && prop.value.type === "Identifier") {
                const localName = prop.value.name;
                const keyName = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
                replacementCode += `window.__notebook_scope.${localName} = ${tempVar}.${keyName}; `;
              }
            });
            replacementCode += `})();\n`;
          } else if (decl.id.type === "ArrayPattern") {
            const initCode = decl.init ? code.slice(decl.init.start, decl.init.end) : "undefined";
            const tempVar = `__destruct_arr_${decl.start}`;
            replacementCode += `(() => { const ${tempVar} = ${initCode}; `;
            decl.id.elements.forEach((elem, index) => {
              if (elem && elem.type === "Identifier") {
                const localName = elem.name;
                replacementCode += `window.__notebook_scope.${localName} = ${tempVar}[${index}]; `;
              }
            });
            replacementCode += `})();\n`;
          }
        });
        modifications.push({ start: node.start, end: node.end, replacement: replacementCode });
      } else if (node.type === "FunctionDeclaration" && node.id) {
        const funcName = node.id.name;
        const funcBody = code.slice(node.start, node.end);
        modifications.push({ start: node.start, end: node.end, replacement: `window.__notebook_scope.${funcName} = ${funcBody.replace(/^function\s+\w+/, "function")}` });
      } else if (node.type === "ClassDeclaration" && node.id) {
        const className = node.id.name;
        const classBody = code.slice(node.start, node.end);
        modifications.push({ start: node.start, end: node.end, replacement: `window.__notebook_scope.${className} = ${classBody.replace(/^class\s+\w+/, "class")}` });
      }
    });

    modifications.sort((a, b) => b.start - a.start);
    let transformedCode = code;
    modifications.forEach(mod => { transformedCode = transformedCode.slice(0, mod.start) + mod.replacement + transformedCode.slice(mod.end); });
    return transformedCode;
  } catch (e) {
    if (code.trim().startsWith("import ") || code.includes("\nimport ")) throw new SyntaxError("Invalid code module layout syntax.");
    return code;
  }
};

export const evaluateCodeAsync = async (code, TARGET, importMapConfig) => {
  const compiledCode = transformImportsAndScope(code, importMapConfig);

  const runCell = new Function("TARGET", "van", `
    return (async () => {
      with (window.__notebook_scope) {
        ${compiledCode}
      }
    })();
  `);

  const result = await runCell(TARGET, van);
  if (result !== undefined && result !== null) {
    van.add(TARGET, result);
  }
};