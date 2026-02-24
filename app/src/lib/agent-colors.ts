export const AGENT_COLOR_PALETTE = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ef4444", // Red
] as const;

export function getRandomAgentColor(): string {
  return AGENT_COLOR_PALETTE[
    Math.floor(Math.random() * AGENT_COLOR_PALETTE.length)
  ];
}
