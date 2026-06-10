# Design System

A small, owned design system — Radix primitives for behaviour, Tailwind v4 for
styling, semantic tokens for everything visual.

## Tokens

Single source of truth: `src/index.css`, via Tailwind v4 `@theme`. Components consume
**semantic** tokens only (`bg-surface`, `text-muted`, `border-line`, `bg-accent`,
`text-warning`, …) — never raw hex or arbitrary values.

- **Palette** — teal canvas (`#0f3d3b` gradient), `surface`/`overlay` depth layers,
  emerald `accent`, cyan `nav-active`, amber `warning`, red `danger`. Extracted from
  the live app and tuned so `muted`/`faint` clear **WCAG AA (≥4.5:1)** on the surface.
- **Type** — Fraunces (serif display) for headings, Inter for body/UI.
- **Radius / shadow / motion** — `--radius-*`, `--shadow-*`, and easing tokens
  (`--ease-out-soft`, `--ease-spring`) plus named `@keyframes` for dialog/popover/
  shake/fade.

## Primitives (`src/components/ui`)

`Button`, `IconButton`, `Input`, `Textarea`, `Field`, `Select`, `Checkbox`, `Switch`,
`Badge`, `Avatar`, `Dialog`, `ConfirmDialog`, `Popover`, `Tooltip`, `PhoneInput`,
`DateInput`, `Spinner`, `Skeleton`, `EmptyState`, `Toaster`.

Behaviour (focus traps, keyboard nav, scroll-lock) comes from Radix; we own the look.
Every interactive element has a branded `focus-visible` ring and a press state.

## Motion

CSS transforms/opacity only (GPU-composited, no `transition: all`). Spring easing on
the toggle thumb, scale on press, scale+fade on dialogs, a shake on error banners, and
`prefers-reduced-motion` is honoured globally.

## Accessibility

WCAG 2.1 AA: semantic landmarks, labelled controls, a skip link, `aria-live` for the
unsaved bar / pagination / toasts, table headers associated with cells, and AA contrast
throughout. Gated by `@axe-core/playwright` in e2e (zero violations); Lighthouse scores 100 in local
audits but is not gated in CI.

> Storybook was scoped out for this standalone hand-in (see [DECISIONS](DECISIONS.md));
> primitive behaviour is documented through their co-located tests instead.
