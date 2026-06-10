import { ChevronRight } from 'lucide-react';
import type { GraphNode } from '@repo/code-graph-core';

type BreadcrumbsProps = {
  path: GraphNode[];
  onNavigate: (id: string) => void;
};

export const Breadcrumbs = ({
  path,
  onNavigate,
}: BreadcrumbsProps): React.ReactElement => (
  <nav className="flex items-center gap-1 text-sm text-zinc-400">
    {path.map((node, i) => {
      const isLast = i === path.length - 1;
      return (
        <span key={node.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate(node.id)}
            className={
              isLast
                ? 'font-medium text-zinc-100'
                : 'transition-colors hover:text-zinc-200'
            }
          >
            {node.name}
          </button>
          {!isLast && <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
        </span>
      );
    })}
  </nav>
);
