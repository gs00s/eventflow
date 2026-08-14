import { Outlet } from '@tanstack/react-router';
import { Nav } from '@/components/nav';

export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
