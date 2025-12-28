import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Text, TextArea, Box, Badge, Callout } from '@radix-ui/themes';
import { Sparkles, Save, X, Merge, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { generateQuestions, generateAnswers } from '../../services/anthropic';

const BlockModal = ({ isOpen, onClose, block, parents, onSave, pyramidContext, allBlocks }) => {
  const { apiKey } = useAuth();
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [combinedQuestion, setCombinedQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionTarget, setSuggestionTarget] = useState(null); // 'question', 'combined', or 'answer'
  const [aiError, setAiError] = useState(null);

  // Helper to format block ID to Chess notation (e.g. 1-A)
  const formatBlockLabel = (id) => {
    if (!id) return '';
    const [u, v] = id.split('-').map(Number);
    const rank = u + 1;
    const file = String.fromCharCode(65 + v);
    return `${rank}-${file}`;
  };

  const buildHistoryContext = () => {
      if (!block || !allBlocks) return "";
      
      const history = [];
      const visited = new Set();
      const queue = [block];

      // Reverse BFS to find all ancestors
      while (queue.length > 0) {
          const current = queue.shift();
          if (visited.has(current.id)) continue;
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
    onSave({
      ...block,
      answer,
      question, // We use 'question' as the primary content now
      combinedQuestion,
      content: question, // Keep content synced for backward compatibility
      status: answer && question ? 'completed' : 'in_progress'
    });
    onClose();
  };

  const handleAiGenerate = async () => {
    if (!apiKey) {
        setAiError("Please set your API Key in the Navbar first.");
        return;
    }
    setIsGenerating(true);
    setAiError(null);
    setSuggestions([]);
    setSuggestionTarget('question');

    try {
        const effectiveParentQuestion = parents && parents.length > 1 
            ? combinedQuestion 
            : (parents?.[0]?.question || parents?.[0]?.content || "Start of the pyramid");

        const historyContext = buildHistoryContext();

        const result = await generateQuestions(apiKey, pyramidContext || "General Problem Solving", 'regular', {
            parentQuestion: effectiveParentQuestion,
            currentAnswer: answer || "No answer provided yet",
            historyContext
        });
        setSuggestions(result);
    } catch (error) {
        console.error(error);
        setAiError(error.message || "Failed to generate suggestions.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAiCombine = async () => {
    if (!apiKey) {
        setAiError("Please set your API Key in the Navbar first.");
        return;
    }
    setIsGenerating(true);
    setAiError(null);
    setSuggestions([]);
    setSuggestionTarget('combined');

    try {
        const parentQuestions = parents.map(p => p.question || p.content);
        const historyContext = buildHistoryContext();
        const result = await generateQuestions(apiKey, pyramidContext || "General Problem Solving", 'combined', {
            parentQuestions,
            historyContext
        });
        setSuggestions(result);
    } catch (error) {
        console.error(error);
        setAiError(error.message || "Failed to combine questions.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAiAnswer = async () => {
    if (!apiKey) {
        setAiError("Please set your API Key in the Navbar first.");
        return;
    }
    setIsGenerating(true);
    setAiError(null);
    setSuggestions([]);
    setSuggestionTarget('answer');

    try {
        // Determine the prompt question: Combined Question > Parent Question > Default
        const promptQuestion = (parents && parents.length > 1 && combinedQuestion) 
            ? combinedQuestion 
            : (parents?.[0]?.question || parents?.[0]?.content || "What is the key insight?");

        if (!promptQuestion) {
             throw new Error("No question available to generate an answer from.");
        }

        const historyContext = buildHistoryContext();
        const result = await generateAnswers(apiKey, pyramidContext || "General Problem Solving", promptQuestion, historyContext);
        setSuggestions(result);
    } catch (error) {
        console.error(error);
        setAiError(error.message || "Failed to generate answer.");
    } finally {
        setIsGenerating(false);
    }
  };

  const applySuggestion = (text) => {
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

  const renderSuggestions = (target) => {
    if (suggestionTarget !== target || suggestions.length === 0) return null;
    return (
        <Flex gap="2" direction="column" className="mb-2 mt-2 bg-purple-50 p-2 rounded border border-purple-100">
            <Text size="1" color="purple" weight="bold">AI Suggestions:</Text>
            {suggestions.map((s, i) => (
                <Box 
                    key={i} 
                    onClick={() => applySuggestion(s)}
                    className="cursor-pointer hover:bg-purple-100 p-1 rounded text-xs text-purple-800 transition-colors"
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
            <Box className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <Text size="2" weight="bold" color="gray" className="uppercase text-xs mb-2 block">
                Previous Level Context (Parents)
              </Text>
              <Flex direction="column" gap="2">
                {parents.map(parent => (
                  <Box key={parent.id} className="text-sm">
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
                    <Button 
                        size="1" 
                        variant="soft" 
                        color="orange" 
                        onClick={handleAiCombine}
                        disabled={isGenerating}
                        title="Combine parent questions into a new one"
                    >
                        <Merge size={14} className="mr-1" />
                        {isGenerating ? 'Combining...' : 'Combine Questions'}
                    </Button>
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
                    <Button 
                        size="1" 
                        variant="ghost" 
                        color="purple" 
                        onClick={handleAiAnswer}
                        disabled={isGenerating}
                    >
                        <Sparkles size={14} className="mr-1" />
                        {isGenerating ? 'Generating...' : 'AI Answer'}
                    </Button>
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
          <Box>
            <Flex justify="between" align="center" className="mb-1">
              <Text as="label" size="2" weight="bold">
                New Question / Insight
              </Text>
              <Flex gap="2">
                <Button 
                    size="1" 
                    variant="ghost" 
                    color="purple" 
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                >
                    <Sparkles size={14} className="mr-1" />
                    {isGenerating ? 'Generating...' : 'AI Suggestion'}
                </Button>
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
