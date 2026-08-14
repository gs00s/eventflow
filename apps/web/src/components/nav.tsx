import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';

const links = [
  { to: '/', label: 'Home' },
  { to: '/speakers', label: 'Speakers' },
] as const;

export function Nav() {
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
      </nav>
    </header>
  );
}
