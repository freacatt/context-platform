import React from 'react';
import { cn } from '@/lib/utils';
import type { AgentConfig } from '@/types/agent';

interface AgentButtonProps {
  agent: AgentConfig;
  lastSessionStatus?: string | null;
  isOpen?: boolean;
  onClick: () => void;
}

const StatusIndicator: React.FC<{ status: string | null | undefined }> = ({ status }) => {
  if (!status || status === 'completed') {
    if (status === 'completed') {
      // Completed: small checkmark ring
      return (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-background border border-border shadow-sm">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-emerald-500">
            <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    }
    return null;
  }

  if (status === 'active') {
    // Active: breathing glow ring with lightning bolt
    return (
      <span className="absolute -top-1 -right-1 flex items-center justify-center">
        <span className="absolute w-5 h-5 rounded-full bg-emerald-400/30 animate-ping" />
        <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
          <svg width="8" height="8" viewBox="0 0 10 12" fill="none">
            <path d="M6 0L2 6H5L4 12L8 5H5L6 0Z" fill="white" />
          </svg>
        </span>
      </span>
    );
  }

  if (status === 'paused') {
    // Paused: amber pause icon
    return (
      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30">
        <svg width="6" height="8" viewBox="0 0 6 8" fill="none">
          <rect x="0" y="0" width="2" height="8" rx="0.5" fill="white" />
          <rect x="4" y="0" width="2" height="8" rx="0.5" fill="white" />
        </svg>
      </span>
    );
  }

  return null;
};

export const AgentButton: React.FC<AgentButtonProps> = ({
  agent,
  lastSessionStatus,
  isOpen,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-xl",
        "cursor-pointer",
        "border border-white/10",
        "min-w-0 max-w-[140px]",
        "hover:brightness-110 transition-all duration-150",
        isOpen && "ring-2 ring-offset-1 ring-offset-background",
      )}
      style={{
        backgroundColor: `${agent.color || '#6366f1'}20`,
        ...(isOpen ? { '--tw-ring-color': `${agent.color || '#6366f1'}80` } as React.CSSProperties : {}),
      }}
      title={`${agent.name}${agent.position ? ` — ${agent.position}` : ''}`}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: agent.color || '#6366f1' }}
      />

      {/* Name + Position */}
      <div className="flex flex-col items-start min-w-0 leading-tight">
        <span className="text-[12px] font-semibold text-foreground truncate w-full">
          {agent.name}
        </span>
        {agent.position && (
          <span className="text-[9px] text-muted-foreground truncate w-full" title={agent.position}>
            {agent.position}
          </span>
        )}
      </div>

      {/* Status indicator */}
      <StatusIndicator status={lastSessionStatus} />
    </button>
  );
};
