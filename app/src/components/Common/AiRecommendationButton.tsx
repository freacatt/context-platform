import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { cn } from "@/lib/utils";

interface AiRecommendationButtonProps<T = string> {
  onGenerate: (apiKey: string, globalContext: string) => Promise<T>;
  onSuccess: (result: T) => void;
  onError?: (error: any) => void;
  label?: string;
  loadingLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  // Deprecated props from Radix migration, kept for compatibility if needed but ignored or mapped
  color?: string; 
}

export const AiRecommendationButton = <T,>({
  onGenerate,
  onSuccess,
  onError,
  label = "AI Recommendation",
  loadingLabel = "Thinking...",
  icon = <Wand2 size={14} className="mr-1" />,
  disabled = false,
  variant = "ghost",
  size = "sm",
  color,
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
      console.error("AI Generation Error:", error);
      if (onError) onError(error);
      else alert("Failed to generate recommendation. Check console.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isGenerating}
      className={cn(
        // Map color to class if ghost/outline and color is provided
        color === 'purple' && variant === 'ghost' && "text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/20",
        color === 'indigo' && variant === 'ghost' && "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/20",
        className
      )}
    >
      {isGenerating ? (
        <>
          <Wand2 size={14} className="mr-2 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  );
};
