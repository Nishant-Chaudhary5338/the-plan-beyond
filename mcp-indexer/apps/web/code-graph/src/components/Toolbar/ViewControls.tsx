import { Home, Maximize2 } from 'lucide-react';

type ViewControlsProps = {
  onHome: () => void;
  onRecenter: () => void;
};

const BTN =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-zinc-400 backdrop-blur-xl hover:bg-white/[0.08] hover:text-zinc-100';

export const ViewControls = ({
  onHome,
  onRecenter,
}: ViewControlsProps): React.ReactElement => (
  <div className="absolute bottom-5 left-5 flex flex-col gap-2">
    <button type="button" onClick={onHome} aria-label="Go to repository root" className={BTN}>
      <Home className="h-4 w-4" />
    </button>
    <button type="button" onClick={onRecenter} aria-label="Recenter view" className={BTN}>
      <Maximize2 className="h-4 w-4" />
    </button>
  </div>
);
