/**
 * Context documents store Lexical editor state as a JSON string. Older documents
 * may contain plain text instead; both are handled here.
 */
import type { SerializedEditorState } from 'lexical';
import { extractPlainText, parseLexical } from '@shared/richText';

export { extractPlainText };

const paragraph = (text: string) => ({
  type: 'paragraph',
  version: 1,
  direction: 'ltr',
  format: '',
  indent: 0,
  children: text ? [{ type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' }] : [],
});

/** Editor state for stored content: Lexical JSON as is, anything else as one paragraph of text. */
export function toEditorState(content: string): SerializedEditorState {
  const lexical = parseLexical(content);
  if (lexical) return lexical as unknown as SerializedEditorState;
  return {
    root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [paragraph(content)] },
  } as unknown as SerializedEditorState;
}

/** Short single-line preview for cards. */
export function documentPreview(content: string, maxLength = 100): string {
  const text = extractPlainText(content).replace(/\s+/g, ' ').trim();
  if (!text) return 'No content yet.';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
