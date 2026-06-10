import type { NodeType, HealthLevel } from '@repo/code-graph-core';

// Structural palette — vivid but harmonious on a dark canvas (matches the legend).
export const TYPE_COLOR: Record<NodeType, string> = {
  repo: '#c084fc',
  app: '#38bdf8',
  package: '#34d399',
  folder: '#d4a373',
  file: '#8da2c0',
  component: '#fbbf24',
  function: '#f472b6',
};

// Health palette — clear, but refined rather than alarm-red.
export const HEALTH_COLOR: Record<HealthLevel, string> = {
  ok: '#22c55e',
  warn: '#eab308',
  error: '#fb5a6a',
  unknown: '#64748b',
};

export const EDGE_COLOR: Record<string, string> = {
  imports: 'rgba(148,163,184,0.35)',
  'depends-on': 'rgba(167,139,250,0.5)',
  calls: 'rgba(251,146,60,0.45)',
  renders: 'rgba(34,211,238,0.45)',
  references: 'rgba(100,116,139,0.3)',
  contains: 'rgba(63,63,70,0.3)',
};

export const IMPACT_COLOR = '#fb923c';
export const SELECTED_COLOR = '#eef2ff';
export const DIMMED_COLOR = '#2a2b34';

const MIN_SIZE = 3;
const MAX_SIZE = 11;

export const nodeSize = (loc: number, childCount: number): number => {
  const weight = Math.max(loc, childCount * 30);
  const scaled = MIN_SIZE + Math.log10(weight + 1) * 2.4;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, scaled));
};
