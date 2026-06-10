import { Field, Input } from '@/components/ui';
import { SectionCard } from './SectionCard';
import type { Contact, Professional } from '../../model/types';

interface ProfessionalSectionProps {
  draft: Contact;
  patchProfessional: (partial: Partial<Professional>) => void;
}

export function ProfessionalSection({ draft, patchProfessional }: ProfessionalSectionProps) {
  const { nickname, company, jobTitle, website } = draft.professional;
  return (
    <SectionCard title="Professional">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nickname">
          {(p) => <Input {...p} value={nickname} onChange={(e) => patchProfessional({ nickname: e.target.value })} placeholder="Enter nickname" />}
        </Field>
        <Field label="Company">
          {(p) => <Input {...p} value={company} onChange={(e) => patchProfessional({ company: e.target.value })} placeholder="Enter company" />}
        </Field>
        <Field label="Job title">
          {(p) => <Input {...p} value={jobTitle} onChange={(e) => patchProfessional({ jobTitle: e.target.value })} placeholder="Enter job title" />}
        </Field>
        <Field label="Website">
          {(p) => <Input {...p} type="url" value={website} onChange={(e) => patchProfessional({ website: e.target.value })} placeholder="Enter website" />}
        </Field>
      </div>
    </SectionCard>
  );
}
