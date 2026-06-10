import { useState } from 'react';
import { Field, Input, Select, DateInput } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { OptionalField } from './OptionalField';
import { TITLES, type Contact, type Title } from '../../model/types';

interface PersonalInfoSectionProps {
  draft: Contact;
  patch: (partial: Partial<Contact>) => void;
}

const TITLE_OPTIONS = TITLES.map((t) => ({ value: t, label: t }));

export function PersonalInfoSection({ draft, patch }: PersonalInfoSectionProps) {
  // Only surface the "required" error once the user has touched (and left) the
  // field — not on a pristine, never-edited contact (A-P1.5).
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const firstNameError =
    firstNameTouched && !draft.firstName.trim() ? 'First name is required' : undefined;

  return (
    <SectionCard title="Personal Information">
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <OptionalField label="Title" value={draft.title ?? ''}>
          {(props) => (
            <Select
              {...props}
              value={draft.title ?? ''}
              onValueChange={(v) => patch({ title: v as Title })}
              options={TITLE_OPTIONS}
              placeholder="Select title…"
            />
          )}
        </OptionalField>
        <Field label="First name" required error={firstNameError}>
          {(props) => (
            <Input
              {...props}
              value={draft.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              onBlur={() => setFirstNameTouched(true)}
              placeholder="Enter first name"
            />
          )}
        </Field>
        <OptionalField label="Middle name" value={draft.middleName}>
          {(props) => (
            <Input
              {...props}
              value={draft.middleName}
              onChange={(e) => patch({ middleName: e.target.value })}
              placeholder="Enter middle name"
            />
          )}
        </OptionalField>
        <OptionalField label="Last name" value={draft.lastName}>
          {(props) => (
            <Input
              {...props}
              value={draft.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              placeholder="Enter last name"
            />
          )}
        </OptionalField>
        <OptionalField label="Date of birth" value={draft.dateOfBirth ?? ''}>
          {(props) => (
            <DateInput
              {...props}
              value={draft.dateOfBirth ?? ''}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
            />
          )}
        </OptionalField>
        <OptionalField label="Anniversary" value={draft.anniversary ?? ''}>
          {(props) => (
            <DateInput
              {...props}
              value={draft.anniversary ?? ''}
              onChange={(e) => patch({ anniversary: e.target.value })}
            />
          )}
        </OptionalField>
      </div>
    </SectionCard>
  );
}
