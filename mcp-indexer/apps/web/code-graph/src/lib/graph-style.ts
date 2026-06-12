import type { NodeType, HealthLevel } from '@repo/code-graph-core';

// Node type → color. Retuned to the ember/signal identity (see
// docs/EXPLORER_REDESIGN.md §B): one ember accent that means "the thing you
// render" (component), one neutral ramp for structure, violet for behaviour.
export const TYPE_COLOR: Record<NodeType, string> = {
  repo: '#F2F3F5', // bright neutral — the root
  app: '#5B9DFF', // info blue — an application surface
  package: '#46D88A', // ok green — a unit that builds
  folder: '#6B7079', // muted — structural, recedes
  file: '#9DA2A9', // secondary — the default grain
  component: '#FF6A2B', // EMBER — the star
  function: '#C792EA', // violet — behaviour / logic
};

// Health palette — paired everywhere with text/icons (never color alone).
export const HEALTH_COLOR: Record<HealthLevel, string> = {
  ok: '#46D88A',
  warn: '#F5B544',
  error: '#F2606A',
  unknown: '#474B52',
};

// Edges read as light, low-alpha threads; only the active relation lights up.
// renders = signal teal (UI composition), calls = ember (behaviour flow),
// depends-on = info blue (package graph). Structure stays faint.
export const EDGE_COLOR: Record<string, string> = {
  contains: 'rgba(71,75,82,0.22)',
  imports: 'rgba(157,162,169,0.30)',
  references: 'rgba(107,112,121,0.22)',
  renders: 'rgba(63,217,196,0.45)',
  calls: 'rgba(255,140,90,0.42)',
  'depends-on': 'rgba(91,157,255,0.45)',
};

// Blast radius IS the alarm in this vocabulary — honest err red (the old viewer's
// magenta is retired; warn-amber stays reserved for cycles, so the two never
// collide). Selection is ember; hover-trace halo is signal-bright.
export const SELECTED_COLOR = '#FF6A2B'; // ember
export const TRACE_COLOR = '#67ECDA'; // signal-bright (hover trace)
export const IMPACT_COLOR = '#F2606A'; // err red (blast radius)
export const CYCLE_COLOR = '#F5B544'; // warn amber (cycle members)
export const DIMMED_COLOR = '#1C1F23'; // surface-3 — backgrounded nodes

const MIN_SIZE = 3;
const MAX_SIZE = 11;

export const nodeSize = (loc: number, childCount: number): number => {
  const weight = Math.max(loc, childCount * 30);
  const scaled = MIN_SIZE + Math.log10(weight + 1) * 2.4;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, scaled));
};
