export const rewriteVariableDeclaration = (
  node,
  code,
) => {
  let replacementCode = "";

  node.declarations.forEach((decl) => {
    const initCode = decl.init
      ? code.slice(decl.init.start, decl.init.end)
      : "undefined";

    if (decl.id.type === "Identifier") {
      const varName = decl.id.name;

      replacementCode +=
        `__scope__.${varName} = ${initCode};\n`;

      return;
    }

    if (decl.id.type === "ObjectPattern") {
      const tempVar = `__destruct_obj_${decl.start}`;

      replacementCode +=
        `(() => { const ${tempVar} = ${initCode}; `;

      decl.id.properties.forEach((prop) => {
        if (
          prop.value &&
          prop.value.type === "Identifier"
        ) {
          const localName = prop.value.name;

          const keyName =
            prop.key.type === "Identifier"
              ? prop.key.name
              : prop.key.value;

          replacementCode +=
            `__scope__.${localName} = ` +
            `${tempVar}.${keyName}; `;
        }
      });

      replacementCode += `})();\n`;

      return;
    }

    if (decl.id.type === "ArrayPattern") {
      const tempVar = `__destruct_arr_${decl.start}`;

      replacementCode +=
        `(() => { const ${tempVar} = ${initCode}; `;

      decl.id.elements.forEach((elem, index) => {
        if (elem && elem.type === "Identifier") {
          replacementCode +=
            `__scope__.${elem.name} = ` +
            `${tempVar}[${index}]; `;
        }
      });

      replacementCode += `})();\n`;
    }
  });

  return replacementCode;
};

export const rewriteFunctionDeclaration = (
  node,
  code,
) => {
  const name = node.id.name;
  const body = code.slice(node.start, node.end);

  return (
    `__scope__.${name} = ` +
    body.replace(/^function\s+\w+/, "function")
  );
};

export const rewriteClassDeclaration = (
  node,
  code,
) => {
  const name = node.id.name;
  const body = code.slice(node.start, node.end);

  return (
    `__scope__.${name} = ` +
    body.replace(/^class\s+\w+/, "class")
  );
};