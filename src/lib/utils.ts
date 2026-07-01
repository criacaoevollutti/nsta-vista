import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Robust check for common video extensions before query params or at end of string
  return /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)(\?|$)/i.test(url);
}
