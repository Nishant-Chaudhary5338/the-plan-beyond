import { Node, SyntaxKind } from 'ts-morph';

export const isPascalCase = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

const RETURNS_JSX_KINDS = new Set<SyntaxKind>([
  SyntaxKind.JsxElement,
  SyntaxKind.JsxSelfClosingElement,
  SyntaxKind.JsxFragment,
]);

export const returnsJsx = (node: Node): boolean => {
  let found = false;
  node.forEachDescendant((descendant, traversal) => {
    if (RETURNS_JSX_KINDS.has(descendant.getKind())) {
      found = true;
      traversal.stop();
    }
  });
  return found;
};

export const classifySymbol = (
  name: string,
  body: Node,
  isTsx: boolean,
): 'component' | 'function' => {
  if (isPascalCase(name) && isTsx && returnsJsx(body)) return 'component';
  return 'function';
};
