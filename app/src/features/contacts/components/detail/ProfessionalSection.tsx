import { Input } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { OptionalField } from './OptionalField';
import type { Contact, Professional } from '../../model/types';

interface ProfessionalSectionProps {
  draft: Contact;
  patchProfessional: (partial: Partial<Professional>) => void;
}

export function ProfessionalSection({ draft, patchProfessional }: ProfessionalSectionProps) {
  const { nickname, company, jobTitle, website } = draft.professional;
  // Secondary for a legacy product — collapsed by default (B8).
  return (
    <SectionCard title="Professional" collapsible defaultCollapsed>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <OptionalField label="Nickname" value={nickname}>
          {(p) => <Input {...p} value={nickname} onChange={(e) => patchProfessional({ nickname: e.target.value })} placeholder="Enter nickname" />}
        </OptionalField>
        <OptionalField label="Company" value={company}>
          {(p) => <Input {...p} value={company} onChange={(e) => patchProfessional({ company: e.target.value })} placeholder="Enter company" />}
        </OptionalField>
        <OptionalField label="Job title" value={jobTitle}>
          {(p) => <Input {...p} value={jobTitle} onChange={(e) => patchProfessional({ jobTitle: e.target.value })} placeholder="Enter job title" />}
        </OptionalField>
        <OptionalField label="Website" value={website}>
          {(p) => <Input {...p} type="url" value={website} onChange={(e) => patchProfessional({ website: e.target.value })} placeholder="Enter website" />}
        </OptionalField>
      </div>
    </SectionCard>
  );
}
