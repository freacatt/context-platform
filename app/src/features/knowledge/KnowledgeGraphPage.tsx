import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { Background, BackgroundVariant, Controls, Handle, Panel, Position, useStore, type Edge, type Node, type NodeProps, type ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { ArrowUpRight, Network, Search, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { KNOWLEDGE_APPS, knowledgeApp } from '@shared/knowledge/registry';
import { LINK_KIND_LABELS, type KnowledgeApp } from '@shared/knowledge/types';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';
import { buildGraph, matchesQuery, nodeRadius, type BuiltGraph } from './graphModel';
import { itemPath } from './itemPath';

const appColor = (app: KnowledgeApp) => WORKSPACE_APPS.find((a) => a.key === app)?.colorClass ?? 'bg-slate-500';

// --- physics -------------------------------------------------------------------------------

type SimNode = SimulationNodeDatum & { key: string; r: number };

interface Forces {
  repel: number;
  distance: number;
}

/**
 * A live force simulation (d3-force) over the graph: links pull, nodes repel and avoid
 * overlapping, a weak pull keeps loose nodes near the centre. Positions survive filter changes.
 * Returns the node positions (refreshed once per animation frame) and drag controls.
 */
function useForceLayout(graph: BuiltGraph, forces: Forces) {
  const nodesRef = useRef(new Map<string, SimNode>());
  const simRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const forcesRef = useRef(forces);
  useLayoutEffect(() => {
    forcesRef.current = forces;
  });

  useEffect(() => {
    const nodes = graph.nodes.map((n) => {
      const node = nodesRef.current.get(n.key) ?? ({ key: n.key } as SimNode);
      node.r = nodeRadius(n.degree);
      return node;
    });
    nodesRef.current = new Map(nodes.map((n) => [n.key, n]));
    const { repel, distance } = forcesRef.current;
    const sim = forceSimulation<SimNode>(nodes)
      .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>(graph.edges.map((e) => ({ source: e.from, target: e.to }))).id((d) => d.key).distance(distance).strength(0.7))
      .force('charge', forceManyBody<SimNode>().strength(-repel).distanceMax(600))
      .force('collide', forceCollide<SimNode>((d) => d.r + 6))
      .force('x', forceX<SimNode>(0).strength(0.04))
      .force('y', forceY<SimNode>(0).strength(0.04));
    let frame = 0;
    sim.on('tick', () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setPositions(new Map(nodes.map((n) => [n.key, { x: n.x ?? 0, y: n.y ?? 0 }])));
        });
      }
    });
    simRef.current = sim;
    return () => {
      sim.stop();
      cancelAnimationFrame(frame);
    };
  }, [graph]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    (sim.force('charge') as ReturnType<typeof forceManyBody<SimNode>>).strength(-forces.repel);
    (sim.force('link') as ReturnType<typeof forceLink<SimNode, SimulationLinkDatum<SimNode>>>).distance(forces.distance);
    sim.alpha(0.6).restart();
  }, [forces.repel, forces.distance]);

  return {
    position: (key: string) => positions.get(key),
    /** Bounding box of the current layout (read from the simulation, not from render state). */
    bounds: () => {
      const nodes = [...nodesRef.current.values()];
      if (!nodes.length) return null;
      const xs = nodes.flatMap((n) => [(n.x ?? 0) - n.r, (n.x ?? 0) + n.r]);
      const ys = nodes.flatMap((n) => [(n.y ?? 0) - n.r, (n.y ?? 0) + n.r + 18]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    },
    /** Pin a node under the pointer and wake the simulation (neighbours follow). */
    drag: (key: string, x: number, y: number) => {
      const node = nodesRef.current.get(key);
      if (!node) return;
      node.fx = x;
      node.fy = y;
      simRef.current?.alphaTarget(0.3).restart();
    },
    release: (key: string) => {
      const node = nodesRef.current.get(key);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      simRef.current?.alphaTarget(0);
    },
  };
}

// --- rendering -----------------------------------------------------------------------------

type DotData = { title: string; app: KnowledgeApp; r: number; dim: boolean; focus: boolean; match: boolean };

const centerHandle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0, opacity: 0 };

function DotNode({ data }: NodeProps<DotData>) {
  const zoom = useStore((s) => s.transform[2]);
  const showLabel = data.focus || data.match || zoom > 0.75;
  return (
    <div className={cn('relative transition-opacity duration-200', data.dim && 'opacity-15')} style={{ width: data.r * 2, height: data.r * 2 }} data-testid="graph-node">
      <Handle type="target" position={Position.Top} style={centerHandle} isConnectable={false} />
      <div
        className={cn(
          'h-full w-full rounded-full shadow-sm transition-transform',
          appColor(data.app),
          data.focus && 'scale-125 ring-4 ring-primary/30',
          data.match && 'ring-4 ring-yellow-400/70',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 top-full mt-1 w-40 -translate-x-1/2 truncate text-center text-xs transition-opacity',
          data.focus ? 'font-semibold text-foreground' : 'text-muted-foreground',
          showLabel ? 'opacity-100' : 'opacity-0',
        )}
      >
        {data.title}
      </div>
      <Handle type="source" position={Position.Top} style={centerHandle} isConnectable={false} />
    </div>
  );
}

const nodeTypes = { dot: DotNode };

function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      <span className="flex justify-between">
        {label} <span className="tabular-nums">{value}</span>
      </span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-primary" />
    </label>
  );
}

// --- page ----------------------------------------------------------------------------------

/** Obsidian-style graph of every item of the workspace and how they relate. */
export default function KnowledgeGraphPage() {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const loaded = useQuery(api.knowledge.graph, { workspaceId });
  const [hiddenApps, setHiddenApps] = useState<Set<KnowledgeApp>>(new Set());
  const [showOrphans, setShowOrphans] = useState(true);
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [forces, setForces] = useState<Forces>({ repel: 220, distance: 90 });

  const input = useMemo(() => loaded ?? { nodes: [], edges: [] }, [loaded]);
  const graph = useMemo(() => buildGraph(input, { hiddenApps, showOrphans }), [input, hiddenApps, showOrphans]);
  const layout = useForceLayout(graph, forces);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  // Frame the graph once the simulation has spread it out, and again when the items change.
  useEffect(() => {
    const timer = setTimeout(() => {
      const box = layout.bounds();
      // Small graphs stay at a readable size instead of being blown up.
      const minSize = 500;
      if (box) {
        flowRef.current?.fitBounds(
          { x: box.x - Math.max(0, minSize - box.width) / 2, y: box.y - Math.max(0, minSize - box.height) / 2, width: Math.max(box.width, minSize), height: Math.max(box.height, minSize) },
          { padding: 0.15, duration: 500 },
        );
      }
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-frame only when the items change, not on every frame
  }, [graph]);
  const byKey = useMemo(() => new Map(graph.nodes.map((n) => [n.key, n])), [graph]);
  const presentApps = useMemo(() => KNOWLEDGE_APPS.filter((a) => input.nodes.some((n) => n.app === a.key)), [input]);

  const focus = hovered ?? (selected && byKey.has(selected) ? selected : null);
  const focusSet = focus ? new Set([focus, ...(graph.neighbours.get(focus) ?? [])]) : null;
  const searching = query.trim() !== '';

  const nodes: Node<DotData>[] = graph.nodes.map((n) => {
    const p = layout.position(n.key);
    const r = nodeRadius(n.degree);
    const match = matchesQuery(n.title, query);
    return {
      id: n.key,
      type: 'dot',
      position: { x: (p?.x ?? 0) - r, y: (p?.y ?? 0) - r },
      data: { title: n.title, app: n.app, r, focus: n.key === focus, match, dim: focusSet ? !focusSet.has(n.key) : searching && !match },
      selectable: false,
    };
  });
  const edges: Edge[] = graph.edges.map((e) => {
    const lit = !!focus && (e.from === focus || e.to === focus);
    const dim = (focus && !lit) || (searching && !focus);
    return {
      id: e.id,
      source: e.from,
      target: e.to,
      type: 'straight',
      style: {
        stroke: lit ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        strokeWidth: lit ? 2 : 1,
        strokeOpacity: dim ? 0.08 : lit ? 0.9 : 0.35,
        strokeDasharray: e.derived ? '4 4' : undefined,
      },
    };
  });

  const panelKey = focus;
  const panelNode = panelKey ? byKey.get(panelKey) : undefined;
  const panelLinks = panelKey
    ? graph.edges
        .filter((e) => e.from === panelKey || e.to === panelKey)
        .map((e) => ({ other: byKey.get(e.from === panelKey ? e.to : e.from)!, kinds: e.kinds, outgoing: e.from === panelKey }))
    : [];
  const open = (key: string) => {
    const node = byKey.get(key);
    if (node) navigate(wp(itemPath(node.app, node.id)));
  };
  const toggleApp = (app: KnowledgeApp) =>
    setHiddenApps((prev) => {
      const next = new Set(prev);
      if (next.has(app)) next.delete(app);
      else next.add(app);
      return next;
    });

  if (loaded === undefined) return <SectionSpinner />;

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-slate-700 text-white">
          <Network size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Knowledge graph</h1>
          <p className="text-xs text-muted-foreground">
            {plural(graph.nodes.length, 'item')} · {plural(graph.edges.length, 'connection')} · drag to rearrange, hover to focus, double-click to open
          </p>
        </div>
      </div>

      {input.nodes.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">This workspace has no items yet.</p>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/20" data-testid="knowledge-graph">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            minZoom={0.1}
            maxZoom={3}
            nodesConnectable={false}
            elementsSelectable={false}
            onNodeMouseEnter={(_e, node) => setHovered(node.id)}
            onNodeMouseLeave={() => setHovered(null)}
            onNodeClick={(_e, node) => setSelected((s) => (s === node.id ? null : node.id))}
            onNodeDoubleClick={(_e, node) => open(node.id)}
            onPaneClick={() => setSelected(null)}
            onNodeDragStart={(_e, node) => layout.drag(node.id, node.position.x + node.data.r, node.position.y + node.data.r)}
            onNodeDrag={(_e, node) => layout.drag(node.id, node.position.x + node.data.r, node.position.y + node.data.r)}
            onNodeDragStop={(_e, node) => layout.release(node.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
            <Controls showInteractive={false} position="bottom-right" />

            <Panel position="top-left">
              <div className="grid w-64 gap-3 rounded-xl border bg-background/90 p-3 shadow-sm backdrop-blur">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input aria-label="Search the graph" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8" />
                </div>
                <div className="flex flex-wrap gap-1.5" aria-label="Apps">
                  {presentApps.map((a) => {
                    const off = hiddenApps.has(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        aria-pressed={!off}
                        onClick={() => toggleApp(a.key)}
                        className={cn('flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition', off ? 'opacity-40' : 'bg-background')}
                      >
                        <span className={cn('size-2 rounded-full', appColor(a.key))} />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="graph-orphans" checked={showOrphans} onCheckedChange={(on) => setShowOrphans(on === true)} />
                  <Label htmlFor="graph-orphans" className="text-xs font-normal text-muted-foreground">
                    Show unlinked items
                  </Label>
                </div>
                <Range label="Repel" value={forces.repel} min={40} max={800} step={20} onChange={(repel) => setForces((f) => ({ ...f, repel }))} />
                <Range label="Link distance" value={forces.distance} min={20} max={300} step={10} onChange={(distance) => setForces((f) => ({ ...f, distance }))} />
              </div>
            </Panel>

            {panelNode && (
              <Panel position="top-right">
                <div className="w-72 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur" data-testid="graph-details">
                  <div className="mb-3 flex items-start gap-2">
                    <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', appColor(panelNode.app))} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{panelNode.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {knowledgeApp(panelNode.app).label} · {panelNode.degree} {panelNode.degree === 1 ? 'connection' : 'connections'}
                      </p>
                    </div>
                    {selected && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Close details" onClick={() => setSelected(null)}>
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                  {panelLinks.length > 0 && (
                    <ul className="mb-3 max-h-56 space-y-1 overflow-y-auto text-sm">
                      {panelLinks.map(({ other, kinds, outgoing }) => (
                        <li key={other.key} className="flex items-center gap-2">
                          <span className={cn('size-2 shrink-0 rounded-full', appColor(other.app))} />
                          <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => setSelected(other.key)}>
                            {other.title}
                          </button>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {outgoing ? '→' : '←'} {kinds.map((k) => LINK_KIND_LABELS[k].toLowerCase()).join(', ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button size="sm" className="w-full" onClick={() => open(panelNode.key)}>
                    Open <ArrowUpRight size={14} className="ml-1" />
                  </Button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
