/**
 * Context documents store Lexical editor state as a JSON string. Older documents
 * may contain plain text instead; both are handled here.
 */
export interface LexicalNode {
  type?: string;
  text?: string;
  children?: LexicalNode[];
}

export function parseLexical(content: string): { root: LexicalNode } | null {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && parsed.root ? parsed : null;
  } catch {
    return null;
  }
}

/** Plain text of stored content; block-level nodes are separated by newlines. */
export function extractPlainText(content: string): string {
  const lexical = parseLexical(content);
  if (!lexical) return content;
  const blocks: string[] = [];
  const inline = (node: LexicalNode): string =>
    node.type === 'linebreak' ? '\n' : (node.text ?? '') + (node.children ?? []).map(inline).join('');
  const walk = (node: LexicalNode) => {
    const children = node.children ?? [];
    const isBlockContainer = children.some((c) => (c.children?.length ?? 0) > 0 && c.type !== 'link');
    if (isBlockContainer && node.type !== 'paragraph') children.forEach(walk);
    else blocks.push(inline(node));
  };
  (lexical.root.children ?? []).forEach(walk);
  return blocks.join('\n').trim();
}
