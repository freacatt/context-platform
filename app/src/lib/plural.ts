/** "1 persona", "3 personas", "0 entries" (pass `plural` for irregular words). */
export const plural = (count: number, word: string, pluralWord = `${word}s`) => `${count} ${count === 1 ? word : pluralWord}`;
