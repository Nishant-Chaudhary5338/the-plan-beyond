import * as path from 'path';
import watcher, { type Event } from '@parcel/watcher';
import type { GraphService } from './graph-service.js';

const IGNORE = [
  'node_modules',
  '.git',
  'build',
  'dist',
  '.turbo',
  '.code-graph',
  'coverage',
  'storybook-static',
];

const DEBOUNCE_MS = 250;

const isSource = (filePath: string): boolean =>
  (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
  !filePath.endsWith('.d.ts');

export const startWatcher = async (
  root: string,
  graph: GraphService,
): Promise<watcher.AsyncSubscription> => {
  let pending = new Set<string>();
  let timer: NodeJS.Timeout | null = null;

  const flush = (): void => {
    const changed = [...pending];
    pending = new Set();
    timer = null;

    const relPaths = changed
      .filter(isSource)
      .map((abs) => path.relative(root, abs));
    if (relPaths.length === 0) return;

    const startedAt = Date.now();
    const updated = graph.enrichFiles(relPaths);
    if (updated.length > 0) {
      console.log(
        `   ↻ ${relPaths.length} file(s) → ${updated.length} nodes re-checked in ${Date.now() - startedAt}ms`,
      );
    }
  };

  const onEvents = (err: Error | null, events: Event[]): void => {
    if (err) {
      console.error('watcher error:', err);
      return;
    }
    for (const event of events) pending.add(event.path);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  };

  return watcher.subscribe(root, onEvents, { ignore: IGNORE });
};
