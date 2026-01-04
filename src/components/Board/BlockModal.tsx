import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Text, TextArea, Box, Badge, Callout } from '@radix-ui/themes';
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
  // const [isGenerating, setIsGenerating] = useState<boolean>(false); // Removed as it is handled by AiRecommendationButton
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
        <Flex gap="2" direction="column" className="mb-2 mt-2 p-2 rounded border" style={{ backgroundColor: 'var(--purple-2)', borderColor: 'var(--purple-6)' }}>
            <Text size="1" color="purple" weight="bold">AI Suggestions:</Text>
            {suggestions.map((s, i) => (
                <Box 
                    key={i} 
                    onClick={() => applySuggestion(s)}
                    className="cursor-pointer p-1 rounded text-xs transition-colors"
                    style={{ color: 'var(--purple-11)' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--purple-4)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    • {s}
                </Box>
            ))}
        </Flex>
    );
  };

  if (!block) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 1000 }}>
        <Dialog.Title>Edit Block {formatBlockLabel(block.id)}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Provide an answer to the previous level and formulate a new question.
        </Dialog.Description>

        {aiError && (
            <Callout.Root color="red" size="1" className="mb-4">
                <Callout.Icon><AlertTriangle size={16} /></Callout.Icon>
                <Callout.Text>{aiError}</Callout.Text>
            </Callout.Root>
        )}

        <Flex direction="column" gap="4">
          {/* Parent Context Section */}
          {parents && parents.length > 0 && (
            <Box className="bg-surface p-3 rounded-md border border-border">
              <Text size="2" weight="bold" className="uppercase text-xs mb-2 block text-foreground-muted">
                Previous Level Context (Parents)
              </Text>
              <Flex direction="column" gap="2">
                {parents.map(parent => (
                  <Box key={parent.id} className="text-sm text-foreground">
                    <Badge color="indigo" variant="soft" className="mr-2">
                      {formatBlockLabel(parent.id)}
                    </Badge>
                    <Text>{parent.question || parent.content || "(No question defined)"}</Text>
                  </Box>
                ))}
              </Flex>
            </Box>
          )}

          {/* Combined Question Section (Only for blocks with >1 parents) */}
          {parents && parents.length > 1 && (
            <Box>
                <Flex justify="between" align="center" className="mb-1">
                    <Text as="label" size="2" weight="bold">
                        Combined Question
                    </Text>
                    <AiRecommendationButton
                        size="1" 
                        variant="soft" 
                        color="orange" 
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
                </Flex>
                <TextArea 
                    placeholder="Formulate a question that combines the insights from the parents..." 
                    value={combinedQuestion}
                    onChange={(e) => setCombinedQuestion(e.target.value)}
                    rows={2}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                />
                {renderSuggestions('combined')}
            </Box>
          )}

          {/* Answer Input - Hidden for the first block (1-A / 0-0) */}
          {block.id !== '0-0' && (
            <Box>
                <Flex justify="between" align="center" className="mb-1">
                    <Text as="label" size="2" weight="bold">
                        {parents && parents.length > 1 ? "Answer to Combined Question" : "Answer to Previous Question"}
                    </Text>
                    <AiRecommendationButton
                        size="1" 
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
                </Flex>
                <TextArea 
                placeholder="Write your answer/insight..." 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                style={{ minHeight: '100px', resize: 'vertical' }}
                />
                {renderSuggestions('answer')}
            </Box>
          )}

          {/* New Question Input */}
          {block.id !== '7-7' && (
            <Box>
                <Flex justify="between" align="center" className="mb-1">
                <Text as="label" size="2" weight="bold">
                    New Question / Insight
                </Text>
                <Flex gap="2">
                    <AiRecommendationButton
                        size="1" 
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
                </Flex>
                </Flex>

                <TextArea 
                placeholder="What is the key question or insight for this block?" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                style={{ minHeight: '100px', resize: 'vertical' }}
                />
                {renderSuggestions('question')}
            </Box>
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSave}>
            <Save size={16} className="mr-2" /> Save Changes
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default BlockModal;
