import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OwnedEvent } from '@eventflow/shared-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { deleteEvent } from '@/lib/api';

export function DeleteEventDialog({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.setQueryData<OwnedEvent[]>(['events', 'mine'], (events) =>
        events?.filter((event) => event.id !== eventId),
      );
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger className={buttonVariants({ variant: 'destructive', size: 'sm' })}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{eventTitle}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will also remove its sessions and all attendee registrations. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteMutation.isError && (
          <p className="text-sm text-destructive">Failed to delete the event. Please try again.</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
