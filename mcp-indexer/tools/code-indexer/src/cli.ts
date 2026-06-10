#!/usr/bin/env node
import * as path from 'path';
import { createConfig } from './config.js';
import { runFullIndex, runIncrementalIndex } from './engine/index.js';
import { writeSnapshot } from './engine/incremental/cache.js';

type ParsedArgs = { command: string; root: string };

const parseArgs = (argv: string[]): ParsedArgs => {
  const [command = 'index', ...rest] = argv;
  const rootFlag = rest.indexOf('--root');
  const rootArg = rootFlag !== -1 ? rest[rootFlag + 1] : undefined;
  const root = rootArg ? path.resolve(rootArg) : process.cwd();
  return { command, root };
};

const summarize = (counts: Record<string, number>): string =>
  Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(' · ');

const runIndexCommand = (root: string, incremental: boolean): void => {
  const config = createConfig(root);
  const { snapshot, durationMs } = incremental
    ? runIncrementalIndex(config)
    : runFullIndex(config);

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
  const argv = process.argv.slice(2);
  const { command, root } = parseArgs(argv);
  if (command === 'index') {
    runIndexCommand(root, argv.includes('--incremental'));
    return;
  }
  console.error(
    `Unknown command: ${command}. Usage: code-indexer index [--root <path>] [--incremental]`,
  );
  process.exit(1);
};

main();
