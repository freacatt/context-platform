import { useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { coord, kind, parents as parentLabels } from '@shared/pyramid/board';
import type { CellRecord } from '@shared/pyramid/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Id } from '@/data/types';
import { CellDiscussion } from './CellDiscussion';

interface BlockModalProps {
  pyramidId: Id<'pyramids'>;
  label: string;
  size: number;
  records: Record<string, CellRecord>;
  rootQuestion: string;
  /** Set when this block's next question can be edited at the current checkpoint. */
  editable: boolean;
  pendingEdit?: string;
  onClose: () => void;
  onEdit: (label: string, nextQuestion: string) => void;
}

const Field = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <Label className="font-bold">{title}</Label>
    <div className="mt-1 rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{children}</div>
  </div>
);

/** A block's record: parents, the host's conclusion and dissent, and its next question. */
export default function BlockModal({ pyramidId, label, size, records, rootQuestion, editable, pendingEdit, onClose, onEdit }: BlockModalProps) {
  const record = records[label];
  const cell = record?.cell;
  // The modal is keyed to one block for its lifetime (the editor remounts it per selection).
  const [nextQuestion, setNextQuestion] = useState(pendingEdit ?? cell?.nextQuestion ?? '');
  const [u, v] = coord(size, label);
  const k = kind(size, u, v);
  const parentQuestion = (p: string) => (p === 'A1' ? rootQuestion : records[p]?.cell.nextQuestion) || '(not concluded yet)';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Block {label}
            <Badge variant="secondary" className="capitalize">
              {k}
            </Badge>
            {cell && <Badge variant="outline">confidence {cell.confidence.toFixed(2)}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {k === 'root'
              ? 'The root question every other block descends from.'
              : "The host's conclusion for this block, and the panel discussion behind it."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {k === 'root' ? (
            <Field title="Root Question">{rootQuestion}</Field>
          ) : (
            <Tabs defaultValue="conclusion">
              <TabsList>
                <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
                <TabsTrigger value="discussion" disabled={!cell}>
                  Discussion
                </TabsTrigger>
              </TabsList>
              <TabsContent value="conclusion" className="flex flex-col gap-4 mt-4">
                  <div className="bg-muted p-3 rounded-md border">
                    <span className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                      Previous Level Context (Parents)
                    </span>
                    <div className="flex flex-col gap-2">
                      {parentLabels(u, v).map((p) => (
                        <div key={p} className="text-sm flex items-center">
                          <Badge
                            variant="secondary"
                            className="mr-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                          >
                            {p}
                          </Badge>
                          <span>{parentQuestion(p)}</span>
                          {cell?.primaryParent === p && (
                            <Badge variant="outline" className="ml-2 border-orange-400 text-orange-600">
                              primary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {cell?.combinedQuestion && <Field title="Combined Question">{cell.combinedQuestion}</Field>}
                  {cell && <Field title={k === 'final' ? 'Final Answer' : 'Conclusion'}>{cell.conclusion}</Field>}
                  {cell && cell.dissent.length > 0 && (
                    <div>
                      <Label className="font-bold">Dissent</Label>
                      <ul className="mt-1 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
                        {cell.dissent.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {k !== 'final' && cell && (
                    <div>
                      <Label htmlFor="block-next-question" className="font-bold">
                        Next Question {record.edited && <span className="font-normal text-muted-foreground">(edited)</span>}
                      </Label>
                      {editable ? (
                        <Textarea
                          id="block-next-question"
                          rows={3}
                          className="mt-1 min-h-[100px]"
                          value={nextQuestion}
                          onChange={(e) => setNextQuestion(e.target.value)}
                        />
                      ) : (
                        <div className="mt-1 rounded-md border bg-muted/40 p-3 text-sm">{cell.nextQuestion}</div>
                      )}
                      {record.edited && (
                        <p className="mt-1 text-xs text-muted-foreground">Host proposed: {record.originalNextQuestion}</p>
                      )}
                    </div>
                  )}
                  {cell && <Field title="Summary">{cell.summary}</Field>}
              </TabsContent>
              <TabsContent value="discussion" className="mt-4">
                <CellDiscussion pyramidId={pyramidId} label={label} />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">{editable ? 'Cancel' : 'Close'}</Button>
          </DialogClose>
          {editable && (
            <Button
              disabled={!nextQuestion.trim()}
              onClick={() => {
                onEdit(label, nextQuestion.trim());
                onClose();
              }}
            >
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
