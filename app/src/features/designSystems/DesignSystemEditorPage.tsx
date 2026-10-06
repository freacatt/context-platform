import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  SCALE_KEYS,
  SCALE_LABELS,
  designSystemToMarkdown,
  toCssVariables,
  toDesignTokens,
  type ColorToken,
  type ComponentProp,
  type DesignComponent,
  type DesignSystemSpec,
  type ScaleKey,
  type ScaleToken,
  type TypeToken,
} from '@shared/specs/designSystem';
import { newEntryId } from '@shared/specs/primitives';
import { EntryList, LinesField, TextAreaField, TextField } from '@/components/form/fields';
import { RowsEditor } from '@/components/form/RowsEditor';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { plural } from '@/lib/plural';

const HEX = /^#[0-9a-f]{6}$/i;

function ColorCell({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        aria-label={`${label} picker`}
        className="h-8 w-8 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
        value={HEX.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <Input aria-label={label} className="h-8 min-w-24" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" />
    </div>
  );
}

function scalePreview(key: ScaleKey, token: ScaleToken) {
  if (key === 'spacing') return <div className="h-3 rounded bg-primary/60" style={{ width: `min(${token.value || '0px'}, 80px)` }} />;
  if (key === 'radii') return <div className="size-8 border-2 border-primary/60 bg-primary/10" style={{ borderRadius: token.value }} />;
  if (key === 'shadows') return <div className="size-8 rounded bg-background" style={{ boxShadow: token.value }} />;
  return null;
}

type Patch = (patch: Partial<DesignSystemSpec>) => void;

function ComponentsTab({ spec, change }: { spec: DesignSystemSpec; change: Patch }) {
  return (
    <EntryList<DesignComponent>
      label="Components"
      noun="component"
      items={spec.components}
      onChange={(components) => change({ components })}
      create={() => ({ id: newEntryId(), name: '', category: '', purpose: '', variants: [], states: [], props: [], dos: [], donts: [], accessibility: '' })}
      title={(c) => c.name}
      empty="No components yet. Describe the building blocks your screens use: buttons, inputs, cards…"
      render={(c, update) => (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" value={c.name} onChange={(name) => update({ name })} placeholder="Button" />
            <TextField label="Category" value={c.category} onChange={(category) => update({ category })} placeholder="Inputs" />
          </div>
          <TextAreaField label="Purpose" rows={2} value={c.purpose} onChange={(purpose) => update({ purpose })} placeholder="When to use it, and when not to" />
          <div className="grid gap-4 sm:grid-cols-2">
            <LinesField label="Variants" rows={3} value={c.variants} onChange={(variants) => update({ variants })} placeholder={'primary\nsecondary\nghost'} />
            <LinesField label="States" rows={3} value={c.states} onChange={(states) => update({ states })} placeholder={'hover\nfocus\ndisabled\nloading'} />
          </div>
          <RowsEditor<ComponentProp>
            label="Props"
            noun="prop"
            items={c.props}
            onChange={(props) => update({ props })}
            create={() => ({ id: newEntryId(), name: '', type: '', description: '' })}
            columns={[
              { key: 'name', label: 'Name', placeholder: 'size' },
              { key: 'type', label: 'Type', placeholder: "'sm' | 'md'" },
              { key: 'description', label: 'Description' },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <LinesField label="Do" rows={3} value={c.dos} onChange={(dos) => update({ dos })} />
            <LinesField label="Don't" rows={3} value={c.donts} onChange={(donts) => update({ donts })} />
          </div>
          <TextAreaField label="Accessibility" rows={2} value={c.accessibility} onChange={(accessibility) => update({ accessibility })} placeholder="Keyboard, focus, labels, contrast" />
        </div>
      )}
    />
  );
}

function DesignSystemEditor({ id, title, initial }: { id: Id<'designSystems'>; title: string; initial: DesignSystemSpec }) {
  const update = useMutation(api.designSystems.update);
  const rename = useMutation(api.designSystems.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));
  const g = spec.guidelines;
  const guideline = (key: keyof DesignSystemSpec['guidelines']) => (value: string) => change({ guidelines: { ...g, [key]: value } });

  return (
    <SpecEditorShell
      app="designSystems"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      meta={<span>· {plural(spec.colors.length, 'color')} · {plural(spec.components.length, 'component')}</span>}
      exports={[
        markdownExport('design_system.md', () => designSystemToMarkdown(title, spec)),
        { label: 'Design tokens (.json)', suffix: 'tokens.json', type: 'application/json', content: () => JSON.stringify(toDesignTokens(spec), null, 2) + '\n' },
        { label: 'CSS variables (.css)', suffix: 'tokens.css', type: 'text/css', content: () => toCssVariables(spec) },
      ]}
    >
      <Tabs defaultValue="foundations">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="foundations">Foundations</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="scales">Spacing & shape</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>

        <TabsContent value="foundations" className="grid gap-5">
          <TextAreaField label="Description" value={spec.description} onChange={(description) => change({ description })} placeholder="What this design system is for and who uses it" />
          <LinesField label="Principles" value={spec.principles} onChange={(principles) => change({ principles })} placeholder={'Clarity over decoration\nOne primary action per screen'} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextAreaField label="Voice and tone" value={g.voiceAndTone} onChange={guideline('voiceAndTone')} />
            <TextAreaField label="Iconography" value={g.iconography} onChange={guideline('iconography')} />
            <TextAreaField label="Layout" value={g.layout} onChange={guideline('layout')} placeholder="Grid, containers, density" />
            <TextAreaField label="Accessibility" value={g.accessibility} onChange={guideline('accessibility')} placeholder="Contrast, focus, motion" />
          </div>
        </TabsContent>

        <TabsContent value="colors">
          <RowsEditor<ColorToken>
            label="Colors"
            noun="color"
            items={spec.colors}
            onChange={(colors) => change({ colors })}
            create={() => ({ id: newEntryId(), name: '', light: '#000000', dark: '#ffffff', description: '' })}
            preview={(c) => (
              <div className="flex overflow-hidden rounded border" aria-hidden>
                <span className="h-7 w-10" style={{ background: c.light }} />
                <span className="h-7 w-10" style={{ background: c.dark }} />
              </div>
            )}
            columns={[
              { key: 'name', label: 'Token', placeholder: 'primary' },
              { key: 'light', label: 'Light', render: (c, u) => <ColorCell label={`${c.name || 'color'} light`} value={c.light} onChange={(light) => u({ light })} /> },
              { key: 'dark', label: 'Dark', render: (c, u) => <ColorCell label={`${c.name || 'color'} dark`} value={c.dark} onChange={(dark) => u({ dark })} /> },
              { key: 'description', label: 'Usage' },
            ]}
          />
        </TabsContent>

        <TabsContent value="typography">
          <RowsEditor<TypeToken>
            label="Type scale"
            noun="text style"
            items={spec.typography}
            onChange={(typography) => change({ typography })}
            create={() => ({ id: newEntryId(), name: '', fontFamily: spec.typography[0]?.fontFamily ?? 'Inter, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '1.5', letterSpacing: '0' })}
            preview={(t) => (
              <span className="block max-w-40 truncate" style={{ fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: t.fontWeight as never, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing }}>
                Aa {t.name}
              </span>
            )}
            columns={[
              { key: 'name', label: 'Token', placeholder: 'body' },
              { key: 'fontFamily', label: 'Font' },
              { key: 'fontSize', label: 'Size', className: 'w-24' },
              { key: 'fontWeight', label: 'Weight', className: 'w-20' },
              { key: 'lineHeight', label: 'Line height', className: 'w-24' },
              { key: 'letterSpacing', label: 'Tracking', className: 'w-24' },
            ]}
          />
        </TabsContent>

        <TabsContent value="scales" className="grid gap-8">
          {SCALE_KEYS.map((key) => (
            <RowsEditor<ScaleToken>
              key={key}
              label={SCALE_LABELS[key]}
              noun={`${SCALE_LABELS[key].toLowerCase()} token`}
              items={spec[key]}
              onChange={(tokens) => change({ [key]: tokens } as Partial<DesignSystemSpec>)}
              create={() => ({ id: newEntryId(), name: '', value: '', description: '' })}
              preview={key === 'motion' || key === 'breakpoints' ? undefined : (t) => scalePreview(key, t)}
              columns={[
                { key: 'name', label: 'Token' },
                { key: 'value', label: 'Value' },
                { key: 'description', label: 'Notes' },
              ]}
            />
          ))}
        </TabsContent>

        <TabsContent value="components">
          <ComponentsTab spec={spec} change={change} />
        </TabsContent>
      </Tabs>
    </SpecEditorShell>
  );
}

export default function DesignSystemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.designSystems.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Design system" backTo={wp('/design-systems')}>
      {(d) => <DesignSystemEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
