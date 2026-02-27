import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function appUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || ''
  return `${baseUrl}${path}`
}
