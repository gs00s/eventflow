import { Link, useNavigate } from '@tanstack/react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

const links = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/speakers', label: 'Speakers' },
] as const;

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Nav() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
        <span className="mr-4 font-semibold">EventFlow</span>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            activeProps={{ className: 'bg-muted text-foreground' }}
          >
            {link.label}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {!isPending && !session?.user && (
            <>
              <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Log in
              </Link>
              <Link to="/register" className={buttonVariants({ variant: 'default', size: 'sm' })}>
                Register
              </Link>
            </>
          )}

          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full">
                <Avatar>
                  <AvatarFallback>{initials(session.user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link to="/profile" />}>Profile</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut();
                    await navigate({ to: '/' });
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>
    </header>
  );
}
