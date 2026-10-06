import { useMemo, useState, type ReactNode } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { CheckCircle2, KeyRound, Loader2, Pencil, Plus, RefreshCw, Search, Settings as SettingsIcon, Sparkles, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { formatMoney, parseMoney } from '@shared/pyramid/money';
import type { HostConfig, PanelistConfig } from '@shared/pyramid/types';
import { PageHeader } from '@/components/collection/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ModelInput } from '@/features/ai/ModelInput';
import { perMillion, useModels } from '@/features/ai/useModels';
import { PanelEditor } from '@/features/pyramids/PanelEditor';
import { cleanPanel } from '@/features/pyramids/panel';
import { withErrorToast } from '@/lib/errors';

type Models = ReturnType<typeof useModels>;
type Preset = Doc<'pyramidPresets'>;

function Section({ title, description, children, action }: { title: string; description: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ApiKeySection() {
  const settings = useQuery(api.aiSettings.get, {});
  const setApiKey = useMutation(api.aiSettings.setApiKey);
  const removeApiKey = useMutation(api.aiSettings.removeApiKey);
  const accountStatus = useAction(api.ai.accountStatus);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);

  const save = async () => {
    setBusy('save');
    const ok = await withErrorToast(() => setApiKey({ apiKey: key }), 'Could not save the key');
    setBusy(null);
    if (ok !== undefined) {
      setKey('');
      toast.success('API key saved');
    }
  };

  const test = async () => {
    setBusy('test');
    const status = await withErrorToast(() => accountStatus({}), 'Could not reach OpenRouter');
    setBusy(null);
    if (status) {
      const limit = status.limit !== null ? ` of $${formatMoney(parseMoney(status.limit), 2)}` : '';
      toast.success(`Connected${status.label ? ` (${status.label})` : ''} · used $${formatMoney(parseMoney(status.usage.total), 2)}${limit}`);
    }
  };

  const source = settings?.keySource;
  return (
    <Section
      title="OpenRouter"
      description="Every AI feature in the app runs on OpenRouter models with this key. It is stored on the server and never shown again."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          {source === undefined ? (
            <span className="text-muted-foreground">Loading…</span>
          ) : source === 'user' ? (
            <>
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Connected</Badge>
              <span className="font-mono text-xs">{settings?.keyHint}</span>
            </>
          ) : source === 'deployment' ? (
            <Badge variant="secondary">Using the workspace server&apos;s key</Badge>
          ) : (
            <Badge variant="outline">No key</Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="password"
            autoComplete="off"
            aria-label="OpenRouter API key"
            placeholder={source === 'user' ? 'Paste a new key to replace it' : 'sk-or-v1-…'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="sm:max-w-md"
          />
          <Button onClick={save} disabled={!key.trim() || busy !== null}>
            {busy === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save key
          </Button>
          <Button variant="outline" onClick={test} disabled={source === 'none' || source === undefined || busy !== null}>
            {busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Test connection
          </Button>
          {source === 'user' && (
            <Button variant="ghost" className="text-destructive" onClick={() => withErrorToast(() => removeApiKey({}))} disabled={busy !== null}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Create a key at{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">
            openrouter.ai/keys
          </a>
          . Usage is billed to your OpenRouter account.
        </p>
      </div>
    </Section>
  );
}

function DefaultsSection({ models }: { models: Models['models'] }) {
  const settings = useQuery(api.aiSettings.get, {});
  // The form starts from the stored defaults, so it mounts once they have loaded.
  if (!settings) return null;
  return <DefaultsForm settings={settings} models={models} />;
}

function DefaultsForm({
  settings,
  models,
}: {
  settings: NonNullable<FunctionReturnType<typeof api.aiSettings.get>>;
  models: Models['models'];
}) {
  const updateDefaults = useMutation(api.aiSettings.updateDefaults);
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel ?? '');
  const [panel, setPanel] = useState<PanelistConfig[]>(settings.defaultPanel ?? [{ model: '' }]);
  const [host, setHost] = useState<HostConfig>(settings.defaultHost ?? { model: '' });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const cleaned = cleanPanel(panel);
    const ok = await withErrorToast(() =>
      updateDefaults({
        defaultModel: defaultModel.trim() || null,
        defaultPanel: cleaned.length ? cleaned : null,
        defaultHost: host.model.trim() ? { ...host, model: host.model.trim() } : null,
      }),
    );
    setBusy(false);
    if (ok !== undefined) toast.success('Defaults saved');
  };

  return (
    <Section title="Default models" description="What AI features use when you do not pick a model, and the panel new pyramids start with.">
      <div className="flex flex-col gap-5">
        <div className="grid gap-1.5 max-w-md">
          <Label htmlFor="default-model" className="font-bold">
            Default model
          </Label>
          <ModelInput id="default-model" value={defaultModel} onChange={setDefaultModel} models={models} placeholder="e.g. openai/gpt-4o-mini" />
        </div>
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">New pyramids</p>
          <PanelEditor panel={panel} onChange={setPanel} host={host} onHostChange={setHost} models={models} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save defaults
          </Button>
        </div>
      </div>
    </Section>
  );
}

interface PresetDraft {
  name: string;
  panel: PanelistConfig[];
  host: HostConfig;
  critiqueRound: boolean;
  defaultSystemPrompt: string;
}

const blankPreset = (): PresetDraft => ({ name: '', panel: [{ model: '' }], host: { model: '' }, critiqueRound: false, defaultSystemPrompt: '' });

function PresetsSection({ models }: { models: Models['models'] }) {
  const presets = useQuery(api.pyramidPresets.list, {});
  const savePreset = useMutation(api.pyramidPresets.save);
  const removePreset = useMutation(api.pyramidPresets.remove);
  const [draft, setDraft] = useState<PresetDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Preset | null>(null);

  const open = (preset?: Preset) =>
    setDraft(preset ? { ...preset, defaultSystemPrompt: preset.defaultSystemPrompt ?? '' } : blankPreset());

  const save = async () => {
    if (!draft) return;
    const ok = await withErrorToast(() =>
      savePreset({
        name: draft.name,
        panel: cleanPanel(draft.panel),
        host: { ...draft.host, model: draft.host.model.trim() },
        critiqueRound: draft.critiqueRound,
        defaultSystemPrompt: draft.defaultSystemPrompt.trim() || undefined,
      }),
    );
    if (ok !== undefined) {
      setDraft(null);
      toast.success('Preset saved');
    }
  };

  const valid = draft && draft.name.trim() && cleanPanel(draft.panel).length > 0 && draft.host.model.trim();

  return (
    <Section
      title="Panel presets"
      description="A saved panel, host and prompts, ready to load into any pyramid."
      action={
        <Button size="sm" onClick={() => open()}>
          <Plus className="mr-2 h-4 w-4" /> New preset
        </Button>
      }
    >
      {presets === undefined ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : presets.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground text-sm">
          <Users className="h-8 w-8 mb-2" />
          No presets yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {presets.map((p) => (
            <div key={p._id} className="rounded-lg border p-3 flex flex-col gap-1 border-l-4 border-l-indigo-500">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.panel.length} panelists{p.critiqueRound ? ' · critique round' : ''}
                  </div>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => open(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${p.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(p)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {p.panel.map((x, i) => (
                <span key={i} className="font-mono text-xs truncate">
                  {x.name ? `${x.name} · ` : ''}
                  {x.model}
                </span>
              ))}
              <span className="text-xs text-muted-foreground">
                host <span className="font-mono">{p.host.model}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Panel preset</DialogTitle>
            <DialogDescription>Saving with an existing name replaces that preset.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="flex flex-col gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="preset-name">Name</Label>
                <Input id="preset-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. strategy trio" />
              </div>
              <PanelEditor
                panel={draft.panel}
                onChange={(panel) => setDraft({ ...draft, panel })}
                host={draft.host}
                onHostChange={(host) => setDraft({ ...draft, host })}
                models={models}
              />
              <div className="grid gap-1.5">
                <Label htmlFor="preset-prompt">Panel system prompt</Label>
                <Textarea
                  id="preset-prompt"
                  rows={3}
                  value={draft.defaultSystemPrompt}
                  onChange={(e) => setDraft({ ...draft, defaultSystemPrompt: e.target.value })}
                  placeholder="Optional; replaces the built-in panel prompt"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.critiqueRound} onCheckedChange={(on) => setDraft({ ...draft, critiqueRound: on === true })} />
                Critique round
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!valid}>
              Save preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Preset"
        description="Pyramids already set up with it are not affected."
        itemName={deleteTarget?.name ?? ''}
        onConfirm={async () => {
          const target = deleteTarget!;
          setDeleteTarget(null);
          await withErrorToast(() => removePreset({ id: target._id }));
        }}
      />
    </Section>
  );
}

function CatalogSection({ models, error, refresh }: Models) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (models ?? []).filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  }, [models, query]);

  return (
    <Section
      title="Model catalog"
      description="OpenRouter models available to the app. Prices per million tokens."
      action={
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      }
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Search models" placeholder="Search models…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
      </div>
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : models === undefined ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <div className="rounded-lg border max-h-[420px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Context</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 300).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{m.id}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.contextLength.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{perMillion(m.promptPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{perMillion(m.completionPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  );
}

const TABS = [{ value: 'ai', label: 'AI', icon: Sparkles }] as const;

export default function SettingsPage() {
  const catalog = useModels();
  return (
    <div className="container mx-auto p-4">
      <PageHeader
        title="Settings"
        description="Your account's settings apply to every workspace."
        icon={SettingsIcon}
        iconClassName="bg-slate-700"
      />
      <Tabs defaultValue="ai">
        <TabsList className="mb-6">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="ai" className="flex flex-col gap-6 max-w-5xl">
          <ApiKeySection />
          <DefaultsSection models={catalog.models} />
          <PresetsSection models={catalog.models} />
          <CatalogSection {...catalog} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
