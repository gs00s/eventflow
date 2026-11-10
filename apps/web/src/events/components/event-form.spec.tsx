import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventForm, type EventFormValues } from './event-form';

const defaultValues: EventFormValues = {
  title: '',
  subtitle: '',
  description: '',
  date: '',
  location: { city: '', venue: '', address: '' },
  organizer: { name: '', image: '' },
  hero: { image: '', cta: '' },
  isVip: false,
};

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Kubernetes Deep Dive' } });
  fireEvent.change(screen.getByLabelText('Subtitle'), { target: { value: 'Hands-on workshop' } });
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'A hands-on workshop for platform teams.' },
  });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-15' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Austin' } });
  fireEvent.change(screen.getByLabelText('Venue'), {
    target: { value: 'Austin Convention Center' },
  });
  fireEvent.change(screen.getByLabelText('Address'), {
    target: { value: '500 E Cesar Chavez St' },
  });
  fireEvent.change(screen.getByLabelText('Organizer Name'), { target: { value: 'Snapsoft' } });
  fireEvent.change(screen.getByLabelText('Organizer Image URL'), { target: { value: '...' } });
  fireEvent.change(screen.getByLabelText('Hero Image URL'), { target: { value: '...' } });
  fireEvent.change(screen.getByLabelText('Hero CTA'), { target: { value: 'Register Now' } });
}

describe('EventForm', () => {
  it('submits the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        submitLabel="Create Event"
        isVipVisible={false}
      />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Kubernetes Deep Dive',
        subtitle: 'Hands-on workshop',
        description: 'A hands-on workshop for platform teams.',
        date: '2026-03-15',
        location: {
          city: 'Austin',
          venue: 'Austin Convention Center',
          address: '500 E Cesar Chavez St',
        },
        organizer: { name: 'Snapsoft', image: '...' },
        hero: { image: '...', cta: 'Register Now' },
        isVip: false,
      });
    });
  });

  it('does not submit while a required field is empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        submitLabel="Create Event"
        isVipVisible={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hides the VIP checkbox when isVipVisible is false', () => {
    render(
      <EventForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        submitLabel="Create Event"
        isVipVisible={false}
      />,
    );

    expect(screen.queryByRole('checkbox', { name: 'VIP event' })).toBeNull();
  });

  it('submits isVip true when the VIP checkbox is shown and checked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        submitLabel="Create Event"
        isVipVisible={true}
      />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole('checkbox', { name: 'VIP event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isVip: true }));
    });
  });

  it('shows the error message returned by onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue('Could not create the event.');
    render(
      <EventForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        submitLabel="Create Event"
        isVipVisible={false}
      />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(await screen.findByText('Could not create the event.')).toBeTruthy();
  });
});
