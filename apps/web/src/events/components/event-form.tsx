import { useState } from 'react';
import { type AnyFieldApi, useForm } from '@tanstack/react-form';
import { eventInputSchema, type EventInput } from '@eventflow/shared-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type EventFormValues = EventInput;

function TextField({
  field,
  label,
  type = 'text',
}: {
  field: AnyFieldApi;
  label: string;
  type?: string;
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
      />
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

function TextAreaField({ field, label }: { field: AnyFieldApi; label: string }) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
      />
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export function EventForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isVipVisible,
}: {
  defaultValues: EventFormValues;
  onSubmit: (values: EventFormValues) => Promise<string | undefined>;
  submitLabel: string;
  isVipVisible: boolean;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    validators: { onSubmit: eventInputSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const error = await onSubmit(value);
      if (error) setSubmitError(error);
    },
  });

  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="title">{(field) => <TextField field={field} label="Title" />}</form.Field>
        <form.Field name="subtitle">
          {(field) => <TextField field={field} label="Subtitle" />}
        </form.Field>
        <form.Field name="description">
          {(field) => <TextAreaField field={field} label="Description" />}
        </form.Field>
        <form.Field name="date">
          {(field) => <TextField field={field} label="Date" type="date" />}
        </form.Field>
        <form.Field name="location.city">
          {(field) => <TextField field={field} label="City" />}
        </form.Field>
        <form.Field name="location.venue">
          {(field) => <TextField field={field} label="Venue" />}
        </form.Field>
        <form.Field name="location.address">
          {(field) => <TextField field={field} label="Address" />}
        </form.Field>
        <form.Field name="organizer.name">
          {(field) => <TextField field={field} label="Organizer Name" />}
        </form.Field>
        <form.Field name="organizer.image">
          {(field) => <TextField field={field} label="Organizer Image URL" />}
        </form.Field>
        <form.Field name="hero.image">
          {(field) => <TextField field={field} label="Hero Image URL" />}
        </form.Field>
        <form.Field name="hero.cta">
          {(field) => <TextField field={field} label="Hero CTA" />}
        </form.Field>

        {isVipVisible && (
          <form.Field name="isVip">
            {(field) => (
              <Field orientation="horizontal">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
                <FieldLabel htmlFor={field.name}>VIP event</FieldLabel>
              </Field>
            )}
          </form.Field>
        )}

        {submitError && <FieldError>{submitError}</FieldError>}

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
}
