import { Field, Input, Select, DateInput } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { TITLES, type Contact, type Title } from '../../model/types';

interface PersonalInfoSectionProps {
  draft: Contact;
  patch: (partial: Partial<Contact>) => void;
}

const TITLE_OPTIONS = TITLES.map((t) => ({ value: t, label: t }));

export function PersonalInfoSection({ draft, patch }: PersonalInfoSectionProps) {
  return (
    <SectionCard title="Personal Information">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title">
          {(props) => (
            <Select
              {...props}
              value={draft.title ?? ''}
              onValueChange={(v) => patch({ title: v as Title })}
              options={TITLE_OPTIONS}
              placeholder="Select title…"
            />
          )}
        </Field>
        <Field label="First name" required>
          {(props) => (
            <Input
              {...props}
              value={draft.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              placeholder="Enter first name"
            />
          )}
        </Field>
        <Field label="Middle name">
          {(props) => (
            <Input
              {...props}
              value={draft.middleName}
              onChange={(e) => patch({ middleName: e.target.value })}
              placeholder="Enter middle name"
            />
          )}
        </Field>
        <Field label="Last name">
          {(props) => (
            <Input
              {...props}
              value={draft.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              placeholder="Enter last name"
            />
          )}
        </Field>
        <Field label="Date of birth">
          {(props) => (
            <DateInput
              {...props}
              value={draft.dateOfBirth ?? ''}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
            />
          )}
        </Field>
        <Field label="Anniversary">
          {(props) => (
            <DateInput
              {...props}
              value={draft.anniversary ?? ''}
              onChange={(e) => patch({ anniversary: e.target.value })}
            />
          )}
        </Field>
      </div>
    </SectionCard>
  );
}
