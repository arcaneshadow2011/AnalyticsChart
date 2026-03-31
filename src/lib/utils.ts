import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { parse } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseCSVDate(dateStr: string): string {
  if (!dateStr) return '';
  // Handles formats like "Sep-19" or "2023-01-01"
  try {
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 3) {
      const parsed = parse(dateStr, 'MMM-yy', new Date());
      return parsed.toISOString().split('T')[0];
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
}

export function calculateMovingAverage(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function getGradient(ctx: CanvasRenderingContext2D, chartArea: { bottom: number; top: number }, color: string) {
  if (!color) return '#000';
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  
  // If it's already an rgba string, we can't just append '33'
  if (color.startsWith('rgba')) {
    gradient.addColorStop(0, color.replace(/[\d.]+\)$/, '0.2)'));
    gradient.addColorStop(1, color);
  } else {
    gradient.addColorStop(0, `${color}33`);
    gradient.addColorStop(1, color);
  }
  return gradient;
}

export function adjustColorOpacity(hex: string, opacity: number): string {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
