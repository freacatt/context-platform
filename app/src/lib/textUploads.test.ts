import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractTextFiles, readTextUploads } from './textUploads';

describe('text uploads', () => {
  it('keeps Markdown and text entries of a zip, in path order', () => {
    const entries = {
      'b/two.md': strToU8('# Two'),
      'a.markdown': strToU8('A'),
      'notes.txt': strToU8('plain'),
      'image.png': strToU8('x'),
      '__MACOSX/a.md': strToU8('junk'),
      '.obsidian/x.md': strToU8('junk'),
      'dir/': new Uint8Array(),
    };
    expect(extractTextFiles(entries)).toEqual([
      { title: 'a.markdown', content: 'A' },
      { title: 'b/two.md', content: '# Two' },
      { title: 'notes.txt', content: 'plain' },
    ]);
  });

  it('reads plain files and zips, and reports what it skipped', async () => {
    const zip = zipSync({ 'x/one.md': strToU8('One') });
    const result = await readTextUploads([
      new File(['Hello'], 'hello.md'),
      new File([zip as BlobPart], 'pack.zip'),
      new File(['%PDF'], 'paper.pdf'),
      new File(['nope'], 'broken.zip'),
    ]);
    expect(result.files).toEqual([
      { title: 'hello.md', content: 'Hello' },
      { title: 'x/one.md', content: 'One' },
    ]);
    expect(result.skipped).toEqual(['paper.pdf', 'broken.zip (not a valid zip)']);
  });
});
