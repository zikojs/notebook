import * as acorn from "acorn";

import {
  rewriteImportNode,
} from "./imports.js";

import {
  rewriteVariableDeclaration,
  rewriteFunctionDeclaration,
  rewriteClassDeclaration,
} from "./scope.js";

export const transformImportsAndScope = (
  code,
  importMapConfig,
) => {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowReturnOutsideFunction: true,
    });

    const modifications = [];

    ast.body.forEach((node) => {
      if (node.type === "ImportDeclaration") {
        modifications.push({
          start: node.start,
          end: node.end,
          replacement: rewriteImportNode(
            node,
            code,
            importMapConfig,
          ),
        });

        return;
      }

      if (node.type === "VariableDeclaration") {
        modifications.push({
          start: node.start,
          end: node.end,
          replacement: rewriteVariableDeclaration(
            node,
            code,
          ),
        });

        return;
      }

      if (
        node.type === "FunctionDeclaration" &&
        node.id
      ) {
        modifications.push({
          start: node.start,
          end: node.end,
          replacement: rewriteFunctionDeclaration(
            node,
            code,
          ),
        });

        return;
      }

      if (
        node.type === "ClassDeclaration" &&
        node.id
      ) {
        modifications.push({
          start: node.start,
          end: node.end,
          replacement: rewriteClassDeclaration(
            node,
            code,
          ),
        });
      }
    });

    modifications.sort(
      (a, b) => b.start - a.start,
    );

    let transformedCode = code;

    modifications.forEach((mod) => {
      transformedCode =
        transformedCode.slice(0, mod.start) +
        mod.replacement +
        transformedCode.slice(mod.end);
    });

    return transformedCode;
  } catch (error) {
    if (
      code.trim().startsWith("import ") ||
      code.includes("\nimport ")
    ) {
      throw new SyntaxError(
        "Invalid code module layout syntax.",
      );
    }

    return code;
  }
};