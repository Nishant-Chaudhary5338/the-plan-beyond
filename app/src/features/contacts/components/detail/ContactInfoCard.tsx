import { useState } from 'react';
import { Check, X, Plus, Star, Trash2 } from 'lucide-react';
import { Badge, Button, IconButton, Input, PhoneInput, DEFAULT_PHONE_VALUE, type PhoneValue } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { formatPhoneDisplay, canonicalizePhone } from '@/lib/phone';
import { isEmail } from '@/lib/validators';
import type { CountryCode } from 'libphonenumber-js';
import type { Contact, Phone } from '../../model/types';

interface ContactInfoCardProps {
  draft: Contact;
  addPhone: (phone: Omit<Phone, 'id'>) => void;
  removePhone: (id: string) => void;
  setIdentifier: (id: string) => void;
  addEmail: (email: string) => void;
  removeEmail: (id: string) => void;
}

export function ContactInfoCard({
  draft,
  addPhone,
  removePhone,
  setIdentifier,
  addEmail,
  removeEmail,
}: ContactInfoCardProps) {
  const [phoneDraft, setPhoneDraft] = useState<PhoneValue | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);

  const confirmPhone = () => {
    if (!phoneDraft) return;
    const canonical = canonicalizePhone(
      phoneDraft.dialCode,
      phoneDraft.number,
      phoneDraft.iso2 as CountryCode,
    );
    if (!canonical) return;
    addPhone({
      countryCode: canonical.countryCode,
      number: canonical.nationalNumber,
      e164: canonical.e164,
      isIdentifier: draft.phones.length === 0,
    });
    setPhoneDraft(null);
  };

  const confirmEmail = () => {
    if (!emailDraft || !isEmail(emailDraft)) return;
    addEmail(emailDraft.trim());
    setEmailDraft(null);
  };

  return (
    <SectionCard title="Contact">
      <ul className="space-y-3">
        {draft.phones.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-content">{formatPhoneDisplay(p.e164)}</span>
            <span className="flex items-center gap-1">
              {p.isIdentifier ? (
                <Badge variant="outline">Identifier</Badge>
              ) : (
                <IconButton label="Set as identifier" size="sm" onClick={() => setIdentifier(p.id)}>
                  <Star className="size-4" />
                </IconButton>
              )}
              {draft.phones.length > 1 ? (
                <IconButton label="Remove number" size="sm" variant="danger" onClick={() => removePhone(p.id)}>
                  <Trash2 className="size-4" />
                </IconButton>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {phoneDraft ? (
        <div className="mt-3 flex items-center gap-2">
          <PhoneInput value={phoneDraft} onChange={setPhoneDraft} />
          <IconButton label="Confirm number" size="sm" variant="solid" onClick={confirmPhone}>
            <Check className="size-4" />
          </IconButton>
          <IconButton label="Cancel" size="sm" onClick={() => setPhoneDraft(null)}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPhoneDraft(DEFAULT_PHONE_VALUE)}
          className="mt-3 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-content"
        >
          <Plus className="size-4" /> Add number
        </button>
      )}

      <hr className="my-4 border-line" />

      <ul className="space-y-2">
        {draft.emails.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-content">{e.email}</span>
            <IconButton label="Remove email" size="sm" variant="danger" onClick={() => removeEmail(e.id)}>
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>

      {emailDraft !== null ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            autoFocus
            type="email"
            value={emailDraft}
            onChange={(ev) => setEmailDraft(ev.target.value)}
            placeholder="Email"
            aria-label="Email address"
          />
          <IconButton label="Confirm email" size="sm" variant="solid" onClick={confirmEmail}>
            <Check className="size-4" />
          </IconButton>
          <IconButton label="Cancel" size="sm" onClick={() => setEmailDraft(null)}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 px-0"
          onClick={() => setEmailDraft('')}
        >
          <Plus className="size-4" /> Add email
        </Button>
      )}
    </SectionCard>
  );
}
