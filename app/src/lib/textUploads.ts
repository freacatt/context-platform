import { strFromU8, unzipSync } from 'fflate';

const TEXT_FILE = /\.(md|markdown|mdx|txt)$/i;

export interface TextFile {
  title: string;
  content: string;
}

/** Markdown/text entries of an unzipped archive, by path; folders, hidden and macOS metadata files are skipped. */
export function extractTextFiles(entries: Record<string, Uint8Array>): TextFile[] {
  return Object.entries(entries)
    .filter(([path]) => TEXT_FILE.test(path) && !path.startsWith('__MACOSX/') && !path.split('/').some((part) => part.startsWith('.')))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, bytes]) => ({ title: path, content: strFromU8(bytes) }));
}

/** File bytes; FileReader fallback for environments without `Blob.arrayBuffer` (jsdom). */
function readBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Reads uploaded `.md`/`.txt` files and `.zip` archives of them. Other files are reported as skipped. */
export async function readTextUploads(files: File[]): Promise<{ files: TextFile[]; skipped: string[] }> {
  const out: TextFile[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      try {
        const inside = extractTextFiles(unzipSync(await readBytes(file)));
        if (inside.length === 0) skipped.push(`${file.name} (no Markdown files inside)`);
        out.push(...inside);
      } catch {
        skipped.push(`${file.name} (not a valid zip)`);
      }
    } else if (TEXT_FILE.test(file.name)) {
      out.push({ title: file.name, content: strFromU8(await readBytes(file)) });
    } else {
      skipped.push(file.name);
    }
  }
  return { files: out, skipped };
}
