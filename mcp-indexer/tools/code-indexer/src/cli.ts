import * as path from 'path';
import { createConfig } from './config.js';
import { runFullIndex, runIncrementalIndex } from './engine/index.js';
import { writeSnapshot } from './engine/incremental/cache.js';
import {
  queryWhoRenders,
  queryWhoCalls,
  queryFindReferences,
  queryBlastRadius,
  queryFindCycles,
  queryGraph,
  type GraphQueryOptions,
  type RefResult,
} from './query.js';

const flagValue = (argv: string[], name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};
const hasFlag = (argv: string[], name: string): boolean => argv.includes(name);
const rootOf = (argv: string[]): string => {
  const r = flagValue(argv, '--root');
  return r ? path.resolve(r) : process.cwd();
};
const requireId = (argv: string[]): string => {
  const id = flagValue(argv, '--id');
  if (!id) {
    console.error('Missing --id <node-id>');
    process.exit(1);
  }
  return id;
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

const printRefs = (label: string, count: number, results: RefResult[]): void => {
  console.log(`${count} ${label}`);
  for (const r of results) {
    const where = r.path ? ` (${r.path})` : '';
    const w = r.weight > 1 ? ` ×${r.weight}` : '';
    console.log(`  - ${r.type} ${r.name}${where}${w}`);
  }
};

const QUERY_USAGE =
  'Usage: code-indexer query <who-renders|who-calls|find-references|blast-radius|find-cycles|graph> [--root <path>] [--id <node-id>] [--types a,b] [--json]\n' +
  '  graph flags: [--summary] [--full] [--lean] [--depth <n>] [--type a,b] [--fields a,b]';

const runQueryCommand = (argv: string[]): void => {
  const [sub] = argv;
  const root = rootOf(argv);
  const json = hasFlag(argv, '--json');
  const out = (value: unknown): void => console.log(JSON.stringify(value, null, 2));

  try {
    switch (sub) {
      case 'who-renders': {
        const res = queryWhoRenders(root, requireId(argv));
        if (json) out(res);
        else printRefs('renderers', res.count, res.results);
        return;
      }
      case 'who-calls': {
        const res = queryWhoCalls(root, requireId(argv));
        if (json) out(res);
        else printRefs('callers', res.count, res.results);
        return;
      }
      case 'find-references': {
        const types = flagValue(argv, '--types')?.split(',').filter(Boolean);
        const res = queryFindReferences(root, requireId(argv), types);
        if (json) out(res);
        else printRefs('references', res.count, res.results);
        return;
      }
      case 'blast-radius': {
        const res = queryBlastRadius(root, requireId(argv));
        if (json) out(res);
        else {
          console.log(`${res.count} impacted`);
          for (const n of res.impacted) {
            console.log(`  - ${n.type} ${n.name}${n.path ? ` (${n.path})` : ''}`);
          }
        }
        return;
      }
      case 'find-cycles': {
        const res = queryFindCycles(root);
        if (json) out(res);
        else {
          console.log(`${res.count} cycles`);
          for (const cycle of res.cycles) {
            console.log(`  - ${cycle.map((n) => n.name).join(' → ')}`);
          }
        }
        return;
      }
      case 'graph': {
        const typeArg = flagValue(argv, '--type')?.split(',').filter(Boolean);
        const fields = flagValue(argv, '--fields')?.split(',').filter(Boolean);
        const depthArg = flagValue(argv, '--depth');
        const opts: GraphQueryOptions = {
          summary: hasFlag(argv, '--summary'),
          full: hasFlag(argv, '--full'),
          lean: hasFlag(argv, '--lean'),
          depth: depthArg !== undefined ? Number(depthArg) : undefined,
          type: typeArg as GraphQueryOptions['type'],
          fields,
        };
        out(queryGraph(root, opts));
        return;
      }
      default:
        console.error(QUERY_USAGE);
        process.exit(1);
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
};

export const runCli = (argv: string[]): void => {
  const [command = 'index', ...rest] = argv;

  if (command === 'index') {
    runIndexCommand(rootOf(rest), rest.includes('--incremental'));
    return;
  }
  if (command === 'query') {
    runQueryCommand(rest);
    return;
  }
  if (command === 'serve') {
    console.error(
      'The HTTP/WS server is provided by the published package: `npx <package> serve`, ' +
        'or run `pnpm serve` inside the monorepo.',
    );
    process.exit(1);
  }
  console.error(
    'Unknown command. Usage:\n' +
      '  code-indexer index [--root <path>] [--incremental]\n' +
      `  code-indexer query ...\n${QUERY_USAGE}`,
  );
  process.exit(1);
};
