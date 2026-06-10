import { Toaster as SonnerToaster } from 'sonner';

/** App-wide toast host. Styled to match the overlay surface. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={24}
      toastOptions={{
        classNames: {
          toast:
            'rounded-2xl bg-overlay text-content ring-1 ring-line-overlay shadow-[var(--shadow-overlay)]',
          description: 'text-muted',
          actionButton: 'bg-accent text-on-accent',
          cancelButton: 'bg-white/10 text-content',
          error: 'text-danger',
          success: 'text-emerald-400',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
