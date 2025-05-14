
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BedDouble, BookOpen, LogOut, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
];

export function AdminNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-grow p-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} passHref>
            <Button
              variant={pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin') ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start",
                 pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin') && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <item.icon className="mr-2 h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full justify-start" onClick={logout}>
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </nav>
  );
}
