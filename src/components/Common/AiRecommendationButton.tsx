import React, { useState } from 'react';
import { Button } from '@radix-ui/themes';
import { Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';

interface AiRecommendationButtonProps<T = string> {
  onGenerate: (apiKey: string, globalContext: string) => Promise<T>;
  onSuccess: (result: T) => void;
  onError?: (error: any) => void;
  label?: string;
  loadingLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "classic" | "solid" | "soft" | "surface" | "outline" | "ghost";
  size?: "1" | "2" | "3" | "4";
  color?: "gray" | "gold" | "bronze" | "brown" | "yellow" | "amber" | "orange" | "tomato" | "red" | "ruby" | "crimson" | "pink" | "plum" | "purple" | "violet" | "iris" | "indigo" | "blue" | "cyan" | "teal" | "jade" | "green" | "grass" | "lime" | "mint" | "sky";
  style?: React.CSSProperties;
  className?: string;
}

export const AiRecommendationButton = <T,>({
  onGenerate,
  onSuccess,
  onError,
  label = "AI Recommendation",
  loadingLabel = "Thinking...",
  icon = <Wand2 size={14} style={{ marginRight: 4 }} />,
  disabled = false,
  variant = "ghost",
  size = "1",
  color = "indigo",
  style,
  className
}: AiRecommendationButtonProps<T>) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { apiKey } = useAuth();
  const { aggregatedContext: globalContext } = useGlobalContext();

  const handleClick = async () => {
    if (!apiKey) {
      alert("Please set your API Key in Settings to use AI features.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await onGenerate(apiKey, globalContext);
      onSuccess(result);
    } catch (error) {
      console.error("AI Generation failed:", error);
      if (onError) onError(error);
      else alert("Failed to generate recommendation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      color={color}
      onClick={handleClick}
      disabled={disabled || isGenerating}
      style={{ cursor: disabled || isGenerating ? 'not-allowed' : 'pointer' }}
    >
      {isGenerating ? (
         <>
           <span className="animate-pulse">✨</span> {loadingLabel}
         </>
      ) : (
        <>
          {icon} {label}
        </>
      )}
    </Button>
  );
};
