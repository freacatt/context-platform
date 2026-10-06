import { describe, expect, it } from 'vitest';
import { documentPreview, extractPlainText, toEditorState } from './richText';

const lexical = (paragraphs: string[]) =>
  JSON.stringify({
    root: {
      type: 'root',
      children: paragraphs.map((text) => ({ type: 'paragraph', children: [{ type: 'text', text }] })),
    },
  });

describe('richText', () => {
  it('extracts text from Lexical JSON, one line per paragraph', () => {
    expect(extractPlainText(lexical(['Hello', 'World']))).toBe('Hello\nWorld');
  });

  it('includes text inside nested containers such as lists', () => {
    const content = JSON.stringify({
      root: {
        children: [
          {
            type: 'list',
            children: [
              { type: 'listitem', children: [{ type: 'text', text: 'one' }] },
              { type: 'listitem', children: [{ type: 'text', text: 'two' }] },
            ],
          },
        ],
      },
    });
    expect(extractPlainText(content)).toBe('one\ntwo');
  });

  it('treats non-Lexical content as plain text', () => {
    expect(extractPlainText('just text')).toBe('just text');
    expect(extractPlainText('{"not":"lexical"}')).toBe('{"not":"lexical"}');
  });

  it('builds an editor state for plain text and keeps Lexical state untouched', () => {
    const state = toEditorState('legacy text') as unknown as { root: { children: { children: { text: string }[] }[] } };
    expect(state.root.children[0].children[0].text).toBe('legacy text');
    expect(toEditorState(lexical(['x']))).toEqual(JSON.parse(lexical(['x'])));
    const empty = toEditorState('') as unknown as { root: { children: { children: unknown[] }[] } };
    expect(empty.root.children[0].children).toEqual([]);
  });

  it('previews documents on one line and truncates long ones', () => {
    expect(documentPreview('')).toBe('No content yet.');
    expect(documentPreview(lexical(['a', 'b']))).toBe('a b');
    expect(documentPreview('x'.repeat(150), 100)).toBe(`${'x'.repeat(100)}…`);
  });
});
