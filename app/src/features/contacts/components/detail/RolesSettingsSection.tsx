import { ChevronDown, Check } from 'lucide-react';
import { Switch, Select, Popover, Badge, Checkbox, Field } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { GROUPS, RELATIONSHIPS, type Contact } from '../../model/types';

interface RolesSettingsSectionProps {
  draft: Contact;
  patch: (partial: Partial<Contact>) => void;
}

const RELATIONSHIP_OPTIONS = RELATIONSHIPS.map((r) => ({ value: r, label: r }));

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-content">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

export function RolesSettingsSection({ draft, patch }: RolesSettingsSectionProps) {
  const toggleGroup = (g: string) => {
    const next = draft.groups.includes(g)
      ? draft.groups.filter((x) => x !== g)
      : [...draft.groups, g];
    patch({ groups: next });
  };

  return (
    <SectionCard title="Roles & Settings">
      <p className="-mt-3 mb-4 text-sm text-faint">
        {draft.groups.length ? `${draft.groups.length} group(s)` : 'No roles assigned'}
      </p>

      <div className="space-y-1">
        <ToggleRow
          label="Emergency Contact"
          checked={draft.isEmergencyContact}
          onChange={(v) => patch({ isEmergencyContact: v })}
        />
        <ToggleRow
          label="Beyond Circle"
          checked={draft.isBeyondCircle}
          onChange={(v) => patch({ isBeyondCircle: v })}
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
                  {draft.groups.includes(g) ? <Check className="size-4 text-emerald-400" /> : null}
                </button>
              ))}
            </div>
          </Popover>
        </div>
      </div>
    </SectionCard>
  );
}
