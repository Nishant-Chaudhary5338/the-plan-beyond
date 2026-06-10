import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { GraphNode } from '@repo/code-graph-core';
import { nodePath } from '@repo/code-graph-core';
import { TYPE_COLOR } from '../../lib/graph-style';
import { TYPE_LABEL } from '../../lib/graph-model';

type CommandPaletteProps = {
  nodes: GraphNode[];
  onClose: () => void;
  onPick: (id: string) => void;
};

const SEARCHABLE = new Set([
  'file',
  'component',
  'function',
  'folder',
  'package',
  'app',
]);
const MAX_RESULTS = 30;

/**
 * ⌘K / Ctrl-K fuzzy node search. Doubles as the keyboard-accessible way to reach
 * any node — the 3D canvas is pointer-driven, so this is the non-visual path:
 * type, arrow, Enter to jump. Ranking is name-first (exact > prefix > substring)
 * then path substring, mirroring the server's chat retrieval heuristic.
 */
// Mounted only while open (App gates it), so state resets on each open without a
// reset effect — keeps the strict react-hooks rules happy.
export const CommandPalette = ({
  nodes,
  onClose,
  onPick,
}: CommandPaletteProps): React.ReactElement => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input on mount (a ref side effect, not state).
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored: { node: GraphNode; score: number }[] = [];
    for (const node of nodes) {
      if (!SEARCHABLE.has(node.type)) continue;
      const name = node.name.toLowerCase();
      const path = (nodePath(node) ?? '').toLowerCase();
      let score: number;
      if (!q) score = 0;
      else if (name === q) score = 100;
      else if (name.startsWith(q)) score = 60;
      else if (name.includes(q)) score = 40;
      else if (path.includes(q)) score = 20;
      else continue;
      scored.push({ node, score });
    }
    scored.sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name));
    return scored.slice(0, MAX_RESULTS).map((s) => s.node);
  }, [nodes, query]);

  const pick = (i: number): void => {
    const node = results[i];
    if (node) {
      onPick(node.id);
      onClose();
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Find a node"
        className="glass w-[34rem] max-w-[90vw] overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <Search className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                pick(active);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            aria-label="Search nodes by name or path"
            placeholder="Find a file, component or function…"
            className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          />
          <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-400">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1" role="listbox" aria-label="Results">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-400">
              {query ? 'No matching nodes' : 'Type to search the graph'}
            </li>
          ) : (
            results.map((node, i) => (
              <li key={node.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-left ${
                    i === active ? 'bg-white/[0.06]' : ''
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TYPE_COLOR[node.type] }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-mono text-sm text-zinc-100">
                    {node.name}
                  </span>
                  <span className="ml-auto shrink-0 truncate pl-3 text-[11px] text-zinc-400">
                    {nodePath(node) ?? TYPE_LABEL[node.type]}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
