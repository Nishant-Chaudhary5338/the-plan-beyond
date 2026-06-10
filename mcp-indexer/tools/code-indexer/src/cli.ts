#!/usr/bin/env node
import * as path from 'path';
import { createConfig } from './config.js';
import { runFullIndex } from './engine/index.js';
import { writeSnapshot } from './engine/incremental/cache.js';

type ParsedArgs = { command: string; root: string };

const parseArgs = (argv: string[]): ParsedArgs => {
  const [command = 'index', ...rest] = argv;
  const rootFlag = rest.indexOf('--root');
  const root =
    rootFlag !== -1 && rest[rootFlag + 1]
      ? path.resolve(rest[rootFlag + 1])
      : process.cwd();
  return { command, root };
};

const summarize = (counts: Record<string, number>): string =>
  Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(' · ');

const runIndexCommand = (root: string): void => {
  const config = createConfig(root);
  const { snapshot, durationMs } = runFullIndex(config);

  const typeCounts = snapshot.nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});

  const target = writeSnapshot(snapshot.meta.root, snapshot);
  console.log(`Indexed ${snapshot.meta.root}`);
  console.log(`  nodes: ${snapshot.meta.nodeCount} (${summarize(typeCounts)})`);
  console.log(`  edges: ${snapshot.meta.edgeCount}`);
  console.log(`  time:  ${durationMs}ms`);
  console.log(`  wrote: ${target}`);
};

const main = (): void => {
  const { command, root } = parseArgs(process.argv.slice(2));
  if (command === 'index') {
    runIndexCommand(root);
    return;
  }
  console.error(`Unknown command: ${command}. Usage: code-indexer index [--root <path>]`);
  process.exit(1);
};

main();
