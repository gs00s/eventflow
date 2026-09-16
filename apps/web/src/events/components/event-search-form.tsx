import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const eventSearchSchema = z.object({
  q: z.string().trim().min(1),
});

export function EventSearchForm({
  defaultValue = '',
  onSubmit,
}: {
  defaultValue?: string;
  onSubmit: (query: string) => void;
}) {
  const form = useForm({
    defaultValues: { q: defaultValue },
    validators: { onSubmit: eventSearchSchema },
    onSubmit: ({ value }) => onSubmit(value.q.trim()),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="q">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name} className="sr-only">
                Search events
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id={field.name}
                  name={field.name}
                  type="search"
                  placeholder="Search events by name or description"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <form.Subscribe selector={(state) => state.values.q.trim().length === 0}>
                  {(isEmpty) => (
                    <Button type="submit" disabled={isEmpty}>
                      Search
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </form>
  );
}
