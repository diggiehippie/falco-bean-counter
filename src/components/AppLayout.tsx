import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Coffee, Menu, X, LogOut } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Products', to: '/products' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <Coffee className="h-6 w-6 text-primary" />
              <span className="font-heading text-lg tracking-wider hidden sm:inline">FALCO CAFFÈ</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t p-2 space-y-1 bg-card">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 container py-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
