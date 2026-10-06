/** Reports: critical path, Markdown, transcripts and a self-contained HTML page with the board. */
import { cells as boardCells, coord, criticalPath, finalLabel, kind, parents, rowLabels, workingRows } from './board';
import { formatMoney, parseMoney, sumMoney, tryParseMoney, type Money } from './money';
import { displayName, type CallRecord, type CellRecord, type HostCell, type PyramidConfig, type PyramidStatus } from './types';

export interface ReportData {
  title: string;
  createdAt: number;
  status: PyramidStatus;
  currentRow: number;
  budgetCap: string | null;
  config: PyramidConfig;
  cells: Record<string, CellRecord>;
  /** Transcripts need `messages`; the other formats ignore them. */
  calls: CallRecord[];
  /** row → panelists that failed in that row */
  failedPanelists: Record<number, string[]>;
}

export type ReportFormat = 'md' | 'html' | 'transcripts';

const money = (value: Money | string | null | undefined): string => {
  const parsed = typeof value === 'bigint' ? value : tryParseMoney(value);
  return parsed === null ? 'n/a' : `$${formatMoney(parsed, 4)}`;
};

const hostCells = (data: ReportData): Record<string, HostCell> =>
  Object.fromEntries(Object.entries(data.cells).map(([l, c]) => [l, c.cell]));

export const reportCriticalPath = (n: number, cellsByLabel: Record<string, HostCell>): string[] =>
  criticalPath(n, (l) => cellsByLabel[l]?.primaryParent, (l) => l in cellsByLabel);

/** The question a cell answered: its combined question, or its single parent's next question. */
export function cellQuestion(n: number, lbl: string, cellsByLabel: Record<string, HostCell>, rootQuestion: string): string {
  const [u, v] = coord(n, lbl);
  const k = kind(n, u, v);
  if (k === 'root') return rootQuestion;
  if (k === 'merge' || k === 'final') return cellsByLabel[lbl]?.combinedQuestion ?? '';
  const parent = parents(u, v)[0];
  if (kind(n, ...coord(n, parent)) === 'root') return rootQuestion;
  return cellsByLabel[parent]?.nextQuestion ?? '';
}

export interface ModelCost {
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  cost: Money;
}

export function costTable(calls: Pick<CallRecord, 'model' | 'promptTokens' | 'completionTokens' | 'cost'>[]): ModelCost[] {
  const agg = new Map<string, ModelCost>();
  for (const c of calls) {
    const a = agg.get(c.model) ?? { model: c.model, calls: 0, promptTokens: 0, completionTokens: 0, cost: 0n };
    a.calls += 1;
    a.promptTokens += c.promptTokens;
    a.completionTokens += c.completionTokens;
    a.cost += parseMoney(c.cost);
    agg.set(c.model, a);
  }
  return [...agg.values()].sort((a, b) => a.model.localeCompare(b.model));
}

const totalCost = (calls: Pick<CallRecord, 'cost'>[]) => sumMoney(calls.map((c) => parseMoney(c.cost)));

function durationSeconds(calls: CallRecord[]): number | null {
  if (calls.length === 0) return null;
  return (Math.max(...calls.map((c) => c.endedAt)) - Math.min(...calls.map((c) => c.startedAt))) / 1000;
}

const panelText = (cfg: PyramidConfig) =>
  cfg.panel.map((p) => (p.name ? `${displayName(p)} (\`${p.model}\`)` : `\`${p.model}\``)).join(', ');

// --- markdown ----------------------------------------------------------------------------

export function renderMarkdown(data: ReportData): string {
  const cfg = data.config;
  const n = cfg.boardSize;
  const cells = hostCells(data);
  const total = totalCost(data.calls);
  const secs = durationSeconds(data.calls);
  const out: string[] = [
    `# ${data.title}`,
    '',
    `**Question:** ${cfg.question}`,
    '',
    '| | |',
    '|---|---|',
    `| Date | ${new Date(data.createdAt).toISOString()} |`,
    `| Board | ${n}x${n} (${workingRows(n).length} working rows) |`,
    `| Critique round | ${cfg.critiqueRound ? 'on' : 'off'} |`,
    `| Panel | ${panelText(cfg)} |`,
    `| Host | \`${cfg.host.model}\` |`,
    `| Status | ${data.status} |`,
    `| Total cost | ${money(total)} (cap ${money(data.budgetCap)}) |`,
    `| Duration | ${secs === null ? 'n/a' : `${secs.toFixed(1)} s`} |`,
    '',
    '## Final answer',
    '',
  ];

  const fl = finalLabel(n);
  const final = cells[fl];
  if (!final) {
    out.push(`_Not reached yet: the pyramid is ${data.status} at row ${data.currentRow}._`, '');
  } else {
    out.push(`**${fl}** - ${final.combinedQuestion}`, '', final.conclusion, '', `Confidence: ${final.confidence.toFixed(2)}`, '');
    if (final.dissent.length) out.push('Key dissent:', ...final.dissent.map((d) => `- ${d}`), '');
  }

  out.push('## Critical path', '');
  const path = reportCriticalPath(n, cells);
  if (path.length === 0) out.push('_Available once the final cell is concluded._', '');
  path.forEach((lbl, i) => {
    const k = kind(n, ...coord(n, lbl));
    const question = cellQuestion(n, lbl, cells, cfg.question);
    if (k === 'root') out.push(`${i + 1}. **${lbl}** (root) - ${question}`);
    else out.push(`${i + 1}. **${lbl}** (${k}) - ${question}`, `   - Conclusion: ${cells[lbl].conclusion}`);
  });

  out.push('', '## Row-by-row flow', '');
  for (const r of workingRows(n)) {
    const labels = rowLabels(n, r).filter((l) => l in data.cells);
    if (labels.length === 0) continue;
    out.push(`### Row ${r}`, '');
    for (const lbl of labels) {
      const stored = data.cells[lbl];
      const cell = stored.cell;
      const k = kind(n, ...coord(n, lbl));
      out.push(`#### ${lbl} (${k})`, '');
      if (k === 'edge') out.push(`- **Question:** ${cellQuestion(n, lbl, cells, cfg.question)}`);
      else out.push(`- **Combined question:** ${cell.combinedQuestion}`);
      out.push(`- **Conclusion:** ${cell.conclusion}`, `- **Confidence:** ${cell.confidence.toFixed(2)}`);
      if (cell.nextQuestion !== null) {
        const note = stored.edited ? ` _(edited at checkpoint; host proposed: ${stored.originalNextQuestion})_` : '';
        out.push(`- **Next question:** ${cell.nextQuestion}${note}`);
      }
      if (cell.dissent.length) out.push('- **Dissent:**', ...cell.dissent.map((d) => `  - ${d}`));
      out.push('');
    }
    const failed = data.failedPanelists[r];
    if (failed?.length) out.push(`_Failed panelists in row ${r}: ${failed.join(', ')}_`, '');
  }

  const rows = costTable(data.calls);
  out.push(
    '## Cost',
    '',
    '| Model | Calls | Tokens in | Tokens out | Cost |',
    '|---|---:|---:|---:|---:|',
    ...rows.map((m) => `| \`${m.model}\` | ${m.calls} | ${m.promptTokens} | ${m.completionTokens} | ${money(m.cost)} |`),
    `| **Total** | ${rows.reduce((a, m) => a + m.calls, 0)} | ${rows.reduce((a, m) => a + m.promptTokens, 0)} | ` +
      `${rows.reduce((a, m) => a + m.completionTokens, 0)} | ${money(total)} |`,
    '',
    '## Appendix',
    '',
    "Every call's prompt and raw output: the transcripts export.",
    '',
  );
  return out.join('\n');
}

// --- transcripts -------------------------------------------------------------------------

const FENCE = '~~~~~';

export function renderTranscripts(data: ReportData): string {
  const out = [`# Transcripts - ${data.title}`, ''];
  data.calls.forEach((c, i) => {
    out.push(
      `## Call ${i + 1} - row ${c.row} - ${c.role} - ${c.panelist ?? 'host'} - \`${c.model}\` - ${c.status}`,
      '',
      `${c.promptTokens} tokens in, ${c.completionTokens} out, ${money(c.cost)}, started ${new Date(c.startedAt).toISOString()}`,
      '',
      '### Prompt',
      '',
    );
    for (const m of c.messages) out.push(`#### ${m.role}`, '', FENCE, m.content, FENCE, '');
    out.push('### Output', '', FENCE, c.output, FENCE, '');
  });
  return out.join('\n');
}

// --- html --------------------------------------------------------------------------------

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderHtml(data: ReportData): string {
  const cfg = data.config;
  const n = cfg.boardSize;
  const cells = hostCells(data);
  const path = reportCriticalPath(n, cells);
  const onPath = new Set(path);
  const total = money(totalCost(data.calls));
  const fl = finalLabel(n);
  const final = cells[fl];

  const boardData = boardCells(n).map((g) => {
    const stored = data.cells[g.label];
    const done = !!stored || g.kind === 'root';
    return {
      label: g.label,
      u: g.u,
      v: g.v,
      kind: g.kind,
      done,
      onPath: onPath.has(g.label),
      question: done ? cellQuestion(n, g.label, cells, cfg.question) : '',
      cell: stored?.cell ?? null,
      edited: stored?.edited ?? false,
    };
  });
  const payload = JSON.stringify(boardData).replace(/</g, '\\u003c');

  const pathHtml = path.length
    ? `<ol>${path
        .map((lbl) => {
          const k = kind(n, ...coord(n, lbl));
          const conclusion = cells[lbl]?.conclusion;
          return `<li><strong>${esc(lbl)}</strong> (${k}) - ${esc(cellQuestion(n, lbl, cells, cfg.question))}${
            conclusion ? `<br><span class="muted">Conclusion:</span> ${esc(conclusion)}` : ''
          }</li>`;
        })
        .join('')}</ol>`
    : '<p class="muted">Available once the final cell is concluded.</p>';

  const finalHtml = final
    ? `<p><strong>${esc(fl)}</strong> - ${esc(final.combinedQuestion ?? '')}</p><p>${esc(final.conclusion)}</p>` +
      `<p class="muted">Confidence ${final.confidence.toFixed(2)}</p>` +
      (final.dissent.length ? `<p>Key dissent:</p><ul>${final.dissent.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '')
    : `<p class="muted">Not reached yet: the pyramid is ${esc(data.status)} at row ${data.currentRow}.</p>`;

  const costRows = costTable(data.calls)
    .map(
      (m) =>
        `<tr><td>${esc(m.model)}</td><td class="n">${m.calls}</td><td class="n">${m.promptTokens}</td><td class="n">${m.completionTokens}</td><td class="n">${money(m.cost)}</td></tr>`,
    )
    .join('');

  const panel = cfg.panel.map((p) => esc(p.name ? `${displayName(p)} (${p.model})` : p.model)).join(', ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title)}</title>
<style>
:root { --bg:#fbfaf7; --fg:#1d1d1f; --muted:#6b6b70; --line:#e2e0da; --card:#ffffff;
  --accent:#2f5bd3; --path:#d9822b; --light:#f0d9b5; --dark:#b58863; }
@media (prefers-color-scheme: dark) { :root { --bg:#141416; --fg:#ececef; --muted:#9a9aa2; --line:#2c2c31;
  --card:#1c1c20; --accent:#7ea0ff; --path:#f0a457; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.55 -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 19px; margin: 32px 0 10px; }
.muted { color: var(--muted); } .q { font-size: 18px; margin: 8px 0 16px; }
table { border-collapse: collapse; width: 100%; } td, th { padding: 6px 8px; border-bottom: 1px solid var(--line); text-align: left; }
th.n, td.n { text-align: right; font-variant-numeric: tabular-nums; }
.meta td:first-child { color: var(--muted); width: 140px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
.board { position: relative; width: 100%; aspect-ratio: 1 / 1; }
.cell { position: absolute; transform: translate(-50%, -50%) rotate(45deg); border: 1px solid rgba(0,0,0,.15);
  font: 700 12px/1 ui-monospace, Menlo, monospace; display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; }
.cell span { transform: rotate(-45deg); }
.cell.light { background: var(--light); color: #8b5a2b; } .cell.dark { background: var(--dark); color: #fbeedd; }
.cell.pending { opacity: .35; cursor: default; } .cell.path { outline: 2px solid var(--path); outline-offset: 1px; }
.cell.sel { box-shadow: 0 0 0 3px var(--accent); }
.detail h3 { margin: 0 0 8px; font-size: 16px; } .detail dt { color: var(--muted); font-size: 13px; margin-top: 10px; }
.detail dd { margin: 2px 0 0; white-space: pre-wrap; } ol li { margin-bottom: 8px; }
</style>
</head>
<body>
<main>
<h1>${esc(data.title)}</h1>
<p class="q">${esc(cfg.question)}</p>
<table class="meta">
<tr><td>Date</td><td>${new Date(data.createdAt).toISOString()}</td></tr>
<tr><td>Board</td><td>${n}x${n}, critique round ${cfg.critiqueRound ? 'on' : 'off'}</td></tr>
<tr><td>Panel</td><td>${panel}</td></tr>
<tr><td>Host</td><td>${esc(cfg.host.model)}</td></tr>
<tr><td>Status</td><td>${esc(data.status)}</td></tr>
<tr><td>Total cost</td><td>${total} (cap ${money(data.budgetCap)})</td></tr>
</table>

<h2>Final answer</h2>
<div class="card">${finalHtml}</div>

<h2>Board</h2>
<p class="muted">Outlined cells form the critical path. Click a cell to see its record.</p>
<div class="layout">
  <div class="card"><div class="board" id="board"></div></div>
  <div class="card detail" id="detail"><p class="muted">Select a cell to see its record.</p></div>
</div>

<h2>Critical path</h2>
${pathHtml}

<h2>Cost</h2>
<table>
<tr><th>Model</th><th class="n">Calls</th><th class="n">Tokens in</th><th class="n">Tokens out</th><th class="n">Cost</th></tr>
${costRows}
<tr><th>Total</th><th></th><th></th><th></th><th class="n">${total}</th></tr>
</table>
</main>
<script id="cells" type="application/json">${payload}</script>
<script>
(function () {
  var n = ${n};
  var cells = JSON.parse(document.getElementById("cells").textContent);
  var board = document.getElementById("board"), detail = document.getElementById("detail");
  var size = 100 / (n + 0.5);
  function el(tag, text) { var e = document.createElement(tag); if (text != null) e.textContent = text; return e; }
  function show(c, btn) {
    document.querySelectorAll(".cell.sel").forEach(function (b) { b.classList.remove("sel"); });
    btn.classList.add("sel");
    detail.innerHTML = "";
    detail.appendChild(el("h3", c.label + " - " + c.kind));
    var dl = el("dl");
    function row(k, v) { if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
      dl.appendChild(el("dt", k)); dl.appendChild(el("dd", Array.isArray(v) ? v.join(" / ") : String(v))); }
    row(c.kind === "root" ? "Root question" : "Question", c.question);
    if (c.cell) {
      row("Conclusion", c.cell.conclusion);
      row("Confidence", c.cell.confidence.toFixed(2));
      row("Dissent", c.cell.dissent);
      row("Next question" + (c.edited ? " (edited)" : ""), c.cell.nextQuestion);
      row("Primary parent", c.cell.primaryParent);
      row("Summary", c.cell.summary);
    }
    detail.appendChild(dl);
  }
  cells.forEach(function (c) {
    var b = el("button"); b.appendChild(el("span", c.label));
    b.className = "cell " + ((c.u + c.v) % 2 === 0 ? "light" : "dark") + (c.done ? "" : " pending") + (c.onPath ? " path" : "");
    var x = 50 + (c.v - c.u) * size / 2, y = (c.u + c.v + 0.5) * size / 2 + (100 - (2 * n - 1) * size / 2) / 2;
    b.style.left = x + "%"; b.style.top = y + "%";
    b.style.width = b.style.height = (size * 0.62) + "%";
    if (c.done) b.addEventListener("click", function () { show(c, b); });
    board.appendChild(b);
  });
})();
</script>
</body>
</html>
`;
}

export function renderReport(data: ReportData, format: ReportFormat): string {
  if (format === 'md') return renderMarkdown(data);
  if (format === 'html') return renderHtml(data);
  return renderTranscripts(data);
}

export interface RunStats {
  models: ModelCost[];
  /** role → calls and cost */
  roles: Partial<Record<CallRecord['role'], { calls: number; cost: Money }>>;
  totalCalls: number;
  /** Attempts that errored or returned unusable output (each was retried or dropped). */
  failedCalls: number;
  totalCost: Money;
  startedAt: number | null;
  endedAt: number | null;
}

/** Totals for the run-details panel. */
export function runStats(calls: Pick<CallRecord, 'model' | 'role' | 'status' | 'promptTokens' | 'completionTokens' | 'cost' | 'startedAt' | 'endedAt'>[]): RunStats {
  const roles: RunStats['roles'] = {};
  for (const c of calls) {
    const r = (roles[c.role] ??= { calls: 0, cost: 0n });
    r.calls += 1;
    r.cost += parseMoney(c.cost);
  }
  return {
    models: costTable(calls),
    roles,
    totalCalls: calls.length,
    failedCalls: calls.filter((c) => c.status !== 'ok').length,
    totalCost: totalCost(calls),
    startedAt: calls.length ? Math.min(...calls.map((c) => c.startedAt)) : null,
    endedAt: calls.length ? Math.max(...calls.map((c) => c.endedAt)) : null,
  };
}
