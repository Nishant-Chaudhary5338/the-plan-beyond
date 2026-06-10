import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  Dialog,
  Button,
  Field,
  Input,
  PhoneInput,
  DEFAULT_PHONE_VALUE,
  FormErrorBanner,
  toast,
} from '@/components/ui';
import { isValidPhone } from '@/lib/phone';
import { useCreateContactMutation } from '../../api/contactsApi';
import { getApiErrorMessage } from '../../api/apiError';

const formSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().default(''),
    iso2: z.string(),
    dialCode: z.string(),
    number: z.string().trim().min(1, 'Phone number is required'),
  })
  .refine((v) => isValidPhone(v.dialCode, v.number), {
    path: ['number'],
    message: 'Enter a valid phone number',
  });

type FormValues = z.infer<typeof formSchema>;

const DEFAULTS: FormValues = {
  firstName: '',
  lastName: '',
  iso2: DEFAULT_PHONE_VALUE.iso2,
  dialCode: DEFAULT_PHONE_VALUE.dialCode,
  number: '',
};

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddContactDialog({ open, onOpenChange }: AddContactDialogProps) {
  const navigate = useNavigate();
  const [createContact, { isLoading, error, reset: resetMutation }] = useCreateContactMutation();
  const { register, handleSubmit, setValue, watch, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  // Reset the form + server error only when the dialog opens.
  useEffect(() => {
    if (!open) return;
    reset(DEFAULTS);
    resetMutation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createContact({
        firstName: values.firstName,
        lastName: values.lastName,
        countryCode: values.dialCode,
        phone: values.number,
      }).unwrap();
      toast.success(`${created.firstName} added to My People`);
      onOpenChange(false);
      navigate(`/contacts/${created.id}`);
    } catch {
      // Error surfaces in the banner below via the `error` state.
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Contact"
      description="Add someone to My People with their name and mobile number."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="add-contact-form" variant="solid" isLoading={isLoading}>
            Add Contact
          </Button>
        </>
      }
    >
      <form id="add-contact-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" required error={formState.errors.firstName?.message}>
            {(props) => <Input autoFocus placeholder="First name" {...props} {...register('firstName')} />}
          </Field>
          <Field label="Last name">
            {(props) => <Input placeholder="Last name" {...props} {...register('lastName')} />}
          </Field>
        </div>

        <Field
          label="Mobile number"
          error={formState.errors.number?.message}
          hint="Used to send notifications and match existing accounts"
        >
          {(props) => (
            <PhoneInput
              id={props.id}
              invalid={Boolean(formState.errors.number)}
              value={{ iso2: watch('iso2'), dialCode: watch('dialCode'), number: watch('number') }}
              onChange={(v) => {
                setValue('iso2', v.iso2);
                setValue('dialCode', v.dialCode);
                setValue('number', v.number, { shouldValidate: formState.isSubmitted });
              }}
            />
          )}
        </Field>

        <FormErrorBanner message={error ? getApiErrorMessage(error) : undefined} />
      </form>
    </Dialog>
  );
}
