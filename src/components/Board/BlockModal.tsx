import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, Merge, AlertTriangle } from 'lucide-react';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { generateQuestions, generateAnswers } from '../../services/anthropic';
import { Block } from '../../types';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: Block | null;
  parents: Block[] | null;
  onSave: (block: Block) => void;
  pyramidContext: string | null;
  allBlocks: Record<string, Block>;
}

const BlockModal: React.FC<BlockModalProps> = ({ isOpen, onClose, block, parents, onSave, pyramidContext, allBlocks }) => {
  const { apiKey } = useAuth();
  const { aggregatedContext: globalContext } = useGlobalContext();
  const [answer, setAnswer] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [combinedQuestion, setCombinedQuestion] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionTarget, setSuggestionTarget] = useState<'question' | 'combined' | 'answer' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Helper to format block ID to Chess notation (e.g. 1-A)
  const formatBlockLabel = (id: string | undefined) => {
    if (!id) return '';
    const [u, v] = id.split('-').map(Number);
    const rank = u + 1;
    const file = String.fromCharCode(65 + v);
    return `${rank}-${file}`;
  };

  const buildHistoryContext = () => {
      if (!block || !allBlocks) return "";
      
      const history: Block[] = [];
      const visited = new Set<string>();
      const queue = [block];

      // Reverse BFS to find all ancestors
      while (queue.length > 0) {
          const current = queue.shift();
          if (!current || visited.has(current.id)) continue;
          visited.add(current.id);

          if (current.id !== block.id) { // Don't add self to history yet
              history.push(current);
          }

          if (current.parentIds) {
              current.parentIds.forEach(pid => {
                  if (allBlocks[pid] && !visited.has(pid)) {
                      queue.push(allBlocks[pid]);
                  }
              });
          }
      }

      // Sort history to provide a chronological flow (Top-Down or Root-to-Leaf)
      // Sorting by ID (u then v) roughly gives levels
      history.sort((a, b) => {
          const [u1, v1] = a.id.split('-').map(Number);
          const [u2, v2] = b.id.split('-').map(Number);
          if (u1 !== u2) return u1 - u2;
          return v1 - v2;
      });

      return history.map(h => {
          const label = formatBlockLabel(h.id);
          return `Block ${label}:
Question: ${h.question || h.content || "N/A"}
Answer: ${h.answer || "N/A"}
`;
      }).join('\n');
  };

  useEffect(() => {
    if (block) {
      setAnswer(block.answer || '');
      setQuestion(block.question || block.content || '');
      setCombinedQuestion(block.combinedQuestion || '');
      setSuggestions([]);
      setSuggestionTarget(null);
      setAiError(null);
    }
  }, [block]);

  const handleSave = () => {
    if (!block) return;
    
    // Special handling for the last block (8-H / 7-7)
    const isLastBlock = block.id === '7-7';
    
    // Status logic: 
    // - Normal blocks: require both answer (to previous) and question (new insight)
    // - Last block: requires only answer (to combined question)
    const isComplete = isLastBlock ? !!answer : (answer && question);

    onSave({
      ...block,
      answer,
      question: isLastBlock ? '' : question, // No new question for last block
      combinedQuestion,
      // For last block, use answer as content so it displays on the board
      // For others, use question as content, but fallback to answer if question is empty
      content: isLastBlock ? answer : (question || answer), 
      status: isComplete ? 'completed' : 'in_progress'
    });
    onClose();
  };


  const applySuggestion = (text: string) => {
      if (suggestionTarget === 'combined') {
          setCombinedQuestion(text);
      } else if (suggestionTarget === 'answer') {
          setAnswer(text);
      } else {
          setQuestion(text);
      }
      setSuggestions([]);
      setSuggestionTarget(null);
  };

  const renderSuggestions = (target: string) => {
    if (suggestionTarget !== target || suggestions.length === 0) return null;
    return (
        <div className="mb-2 mt-2 p-2 rounded border bg-purple-100/50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">AI Suggestions:</span>
            {suggestions.map((s, i) => (
                <div 
                    key={i} 
                    onClick={() => applySuggestion(s)}
                    className="cursor-pointer p-1 rounded text-xs transition-colors text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/50"
                >
                    • {s}
                </div>
            ))}
        </div>
    );
  };

  if (!block) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Block {formatBlockLabel(block.id)}</DialogTitle>
          <DialogDescription>
            Provide an answer to the previous level and formulate a new question.
          </DialogDescription>
        </DialogHeader>

        {aiError && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{aiError}</AlertDescription>
            </Alert>
        )}

        <div className="flex flex-col gap-4">
          {/* Parent Context Section */}
          {parents && parents.length > 0 && (
            <div className="bg-muted p-3 rounded-md border">
              <span className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                Previous Level Context (Parents)
              </span>
              <div className="flex flex-col gap-2">
                {parents.map(parent => (
                  <div key={parent.id} className="text-sm flex items-center">
                    <Badge variant="secondary" className="mr-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      {formatBlockLabel(parent.id)}
                    </Badge>
                    <span>{parent.question || parent.content || "(No question defined)"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combined Question Section (Only for blocks with >1 parents) */}
          {parents && parents.length > 1 && (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <Label className="font-bold">
                        Combined Question
                    </Label>
                    <AiRecommendationButton
                        size="sm" 
                        variant="ghost" 
                        color="orange" // Keeping for legacy, though not used in ShadCN button directly unless mapped
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        label="Combine Questions"
                        loadingLabel="Combining..."
                        icon={<Merge size={14} className="mr-1" />}
                        onGenerate={async (apiKey, globalContext) => {
                            setSuggestionTarget('combined');
                            setSuggestions([]);
                            setAiError(null);
                            
                            const parentQuestions = parents.map(p => p.question || p.content || "").join("\n");

                            return await generateQuestions(
                                apiKey, 
                                pyramidContext || "General Problem Solving", 
                                'combine', 
                                {
                                    parentQuestion: parentQuestions,
                                    currentAnswer: "",
                                    historyContext: ""
                                },
                                globalContext
                            );
                        }}
                        onSuccess={setSuggestions}
                        onError={(err) => setAiError(err.message || "Failed to combine questions.")}
                    />
                </div>
                <Textarea 
                    placeholder="Formulate a question that combines the insights from the parents..." 
                    value={combinedQuestion}
                    onChange={(e) => setCombinedQuestion(e.target.value)}
                    rows={2}
                    className="min-h-[80px]"
                />
                {renderSuggestions('combined')}
            </div>
          )}

          {/* Answer Input - Hidden for the first block (1-A / 0-0) */}
          {block.id !== '0-0' && (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <Label className="font-bold">
                        {parents && parents.length > 1 ? "Answer to Combined Question" : "Answer to Previous Question"}
                    </Label>
                    <AiRecommendationButton
                        size="sm" 
                        variant="ghost" 
                        color="purple"
                        label="AI Answer"
                        loadingLabel="Generating..."
                        icon={<Sparkles size={14} className="mr-1" />}
                        onGenerate={async (apiKey, globalContext) => {
                            setSuggestionTarget('answer');
                            setSuggestions([]);
                            setAiError(null);

                            const questionToAnswer = parents && parents.length > 1 
                                ? combinedQuestion 
                                : (parents?.[0]?.question || parents?.[0]?.content || "Start of the pyramid");
                            
                            const historyContext = buildHistoryContext();

                            return await generateAnswers(
                                apiKey, 
                                pyramidContext || "General Problem Solving", 
                                questionToAnswer, 
                                {
                                    historyContext
                                },
                                globalContext
                            );
                        }}
                        onSuccess={setSuggestions}
                        onError={(err) => setAiError(err.message || "Failed to generate answer.")}
                    />
                </div>
                <Textarea 
                placeholder="Write your answer/insight..." 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                className="min-h-[100px]"
                />
                {renderSuggestions('answer')}
            </div>
          )}

          {/* New Question Input */}
          {block.id !== '7-7' && (
            <div>
                <div className="flex justify-between items-center mb-1">
                <Label className="font-bold">
                    New Question / Insight
                </Label>
                <div className="flex gap-2">
                    <AiRecommendationButton
                        size="sm" 
                        variant="ghost" 
                        color="purple"
                        label="AI Suggestion"
                        loadingLabel="Generating..."
                        icon={<Sparkles size={14} className="mr-1" />}
                        onGenerate={async (apiKey, globalContext) => {
                            setSuggestionTarget('question');
                            setSuggestions([]);
                            setAiError(null);

                            const effectiveParentQuestion = parents && parents.length > 1 
                                ? combinedQuestion 
                                : (parents?.[0]?.question || parents?.[0]?.content || "Start of the pyramid");

                            const historyContext = buildHistoryContext();
                            
                            return await generateQuestions(
                                apiKey, 
                                pyramidContext || "General Problem Solving", 
                                'regular', 
                                {
                                    parentQuestion: effectiveParentQuestion,
                                    currentAnswer: answer || "No answer provided yet",
                                    historyContext
                                },
                                globalContext
                            );
                        }}
                        onSuccess={setSuggestions}
                        onError={(err) => setAiError(err.message || "Failed to generate suggestions.")}
                    />
                </div>
                </div>

                <Textarea 
                placeholder="What is the key question or insight for this block?" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className="min-h-[100px]"
                />
                {renderSuggestions('question')}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockModal;
