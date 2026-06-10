import { useId, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Switch, Select, Popover, Badge, Checkbox, Field, InfoPopover, ConfirmDialog, toast } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { GROUPS, RELATIONSHIPS, type Contact } from '../../model/types';
import { displayName } from '../../utils/filterContacts';
import { ROLE_DEFINITIONS, TOGGLE_CONSEQUENCE, OFF_TOGGLE_CONFIRM } from '../../model/microcopy';

interface RolesSettingsSectionProps {
  draft: Contact;
  patch: (partial: Partial<Contact>) => void;
}

const RELATIONSHIP_OPTIONS = RELATIONSHIPS.map((r) => ({ value: r, label: r }));

interface RoleToggleProps {
  label: string;
  /** One-line consequence shown beneath the toggle (B2). */
  consequence: string;
  /** ⓘ definition + example (B2). */
  info: { definition: string; example: string };
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Confirm body shown when turning the role OFF (B3). */
  confirmOffBody: string;
  /** Toast suffix after an OFF, e.g. "removed from your Beyond Circle". */
  offToast: string;
}

/**
 * A consequential role toggle: turning ON is instant; turning OFF requires a
 * quiet confirm naming what it removes, then offers an Undo toast (B3). The
 * knob slide + colour cross-fade are handled by the Switch (reduced-motion
 * respected globally).
 */
function RoleToggle({ label, consequence, info, checked, onChange, confirmOffBody, offToast }: RoleToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Link the consequence line to the switch so a screen reader announces what
  // turning it off removes — before the user flips it, not after.
  const consequenceId = useId();

  const handle = (next: boolean) => {
    if (next) onChange(true); // ON is instant, no confirm
    else setConfirmOpen(true); // OFF is consequential → confirm
  };

  const confirmOff = () => {
    onChange(false);
    setConfirmOpen(false);
    toast(offToast, { action: { label: 'Undo', onClick: () => onChange(true) } });
  };

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-0.5 text-sm text-content">
          {label}
          <InfoPopover label={label} definition={info.definition} example={info.example} />
        </span>
        <Switch checked={checked} onCheckedChange={handle} aria-label={label} aria-describedby={consequenceId} />
      </div>
      <p id={consequenceId} className="mt-0.5 max-w-[40ch] text-xs text-faint">{consequence}</p>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => !o && setConfirmOpen(false)}
        title={`Turn off ${label}?`}
        description={confirmOffBody}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmOff}
      />
    </div>
  );
}

export function RolesSettingsSection({ draft, patch }: RolesSettingsSectionProps) {
  const name = displayName(draft) || 'this contact';
  const toggleGroup = (g: string) => {
    const next = draft.groups.includes(g)
      ? draft.groups.filter((x) => x !== g)
      : [...draft.groups, g];
    patch({ groups: next });
  };

  // Summarise from the *actual* active roles, not just group count — a contact
  // can be an emergency contact or in the Beyond Circle with zero groups and
  // still has roles assigned (A-P0.2).
  const summaryParts = [
    draft.isEmergencyContact ? 'Emergency contact' : null,
    draft.isBeyondCircle ? 'In your Beyond Circle' : null,
    draft.relationship || null,
    ...draft.groups,
  ].filter((p): p is string => Boolean(p));
  const summary = summaryParts.length ? summaryParts.join(' · ') : 'No roles assigned yet';

  return (
    <SectionCard title="Roles & Settings">
      <p className="-mt-3 mb-4 text-sm text-faint">{summary}</p>

      <div className="space-y-1">
        <RoleToggle
          label="Emergency Contact"
          consequence={TOGGLE_CONSEQUENCE.emergency}
          info={ROLE_DEFINITIONS.emergency}
          checked={draft.isEmergencyContact}
          onChange={(v) => patch({ isEmergencyContact: v })}
          confirmOffBody={OFF_TOGGLE_CONFIRM.emergency(name)}
          offToast={`${name} removed as an emergency contact`}
        />
        <RoleToggle
          label="Beyond Circle"
          consequence={TOGGLE_CONSEQUENCE.beyondCircle}
          info={ROLE_DEFINITIONS.beyondCircle}
          checked={draft.isBeyondCircle}
          onChange={(v) => patch({ isBeyondCircle: v })}
          confirmOffBody={OFF_TOGGLE_CONFIRM.beyondCircle(name)}
          offToast={`${name} removed from your Beyond Circle`}
        />
      </div>

      <div className="mt-5 space-y-5">
        <Field label="Relationship">
          {(props) => (
            <Select
              {...props}
              value={draft.relationship ?? ''}
              onValueChange={(v) => patch({ relationship: v })}
              options={RELATIONSHIP_OPTIONS}
              placeholder="Select relationship…"
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Groups</span>
          <Popover
            trigger={
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-field)] bg-white/5 px-3.5 py-2 text-sm ring-1 ring-inset ring-line hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex flex-wrap gap-1">
                  {draft.groups.length ? (
                    draft.groups.map((g) => <Badge key={g}>{g}</Badge>)
                  ) : (
                    <span className="text-faint">Select groups…</span>
                  )}
                </span>
                <ChevronDown className="size-4 shrink-0 text-faint" aria-hidden="true" />
              </button>
            }
          >
            <div className="w-56">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-white/8"
                >
                  <span className="flex items-center gap-2">
                    <Checkbox checked={draft.groups.includes(g)} readOnly tabIndex={-1} />
                    {g}
                  </span>
                  {draft.groups.includes(g) ? <Check className="size-4 text-accent-bright" /> : null}
                </button>
              ))}
            </div>
          </Popover>
        </div>
      </div>
    </SectionCard>
  );
}
