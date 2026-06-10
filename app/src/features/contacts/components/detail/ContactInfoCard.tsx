import { useState } from 'react';
import { Check, X, Plus, Star, Trash2 } from 'lucide-react';
import { Badge, Button, IconButton, Input, InfoPopover, PhoneInput, Select, DEFAULT_PHONE_VALUE, type PhoneValue } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { formatPhoneDisplay, canonicalizePhone } from '@/lib/phone';
import { isEmail } from '@/lib/validators';
import type { CountryCode } from 'libphonenumber-js';
import { PHONE_TYPES, type Contact, type Phone, type PhoneType } from '../../model/types';

const PHONE_TYPE_OPTIONS = PHONE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

interface ContactInfoCardProps {
  draft: Contact;
  addPhone: (phone: Omit<Phone, 'id'>) => void;
  removePhone: (id: string) => void;
  setIdentifier: (id: string) => void;
  setPhoneType: (id: string, phoneType: string) => void;
  addEmail: (email: string) => void;
  removeEmail: (id: string) => void;
}

export function ContactInfoCard({
  draft,
  addPhone,
  removePhone,
  setIdentifier,
  setPhoneType,
  addEmail,
  removeEmail,
}: ContactInfoCardProps) {
  const [phoneDraft, setPhoneDraft] = useState<PhoneValue | null>(null);
  const [phoneTypeDraft, setPhoneTypeDraft] = useState<PhoneType>('mobile');
  const [emailDraft, setEmailDraft] = useState<string | null>(null);

  const startAddPhone = () => {
    setPhoneTypeDraft('mobile');
    setPhoneDraft(DEFAULT_PHONE_VALUE);
  };

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
      phoneType: phoneTypeDraft,
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
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-content">{formatPhoneDisplay(p.e164)}</span>
              <Select
                value={p.phoneType ?? 'mobile'}
                onValueChange={(v) => setPhoneType(p.id, v)}
                options={PHONE_TYPE_OPTIONS}
                aria-label={`Type for ${formatPhoneDisplay(p.e164)}`}
                className="h-7 w-auto shrink-0 gap-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted"
              />
            </span>
            <span className="flex items-center gap-1">
              {p.isIdentifier ? (
                <span className="flex items-center">
                  <Badge variant="outline">Identifier</Badge>
                  <InfoPopover
                    label="Identifier"
                    definition="The contact detail their account is matched to if you invite them to The Plan Beyond."
                    example="Reassign it anytime with the star on another number."
                  />
                </span>
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
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PhoneInput value={phoneDraft} onChange={setPhoneDraft} />
            <IconButton label="Confirm number" size="sm" variant="solid" onClick={confirmPhone}>
              <Check className="size-4" />
            </IconButton>
            <IconButton label="Cancel" size="sm" onClick={() => setPhoneDraft(null)}>
              <X className="size-4" />
            </IconButton>
          </div>
          <Select
            value={phoneTypeDraft}
            onValueChange={(v) => setPhoneTypeDraft(v as PhoneType)}
            options={PHONE_TYPE_OPTIONS}
            aria-label="Phone type"
            className="h-9 w-32 self-start text-xs"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={startAddPhone}
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
