
"use client"; // This layout uses client-side hooks for auth

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppHeader } from '@/components/layout/app-header';
import { AdminNav } from '@/components/layout/admin-nav';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/login?redirect=/admin'); // Redirect to login if not admin
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // This content will be briefly shown before redirect or if redirect fails
    // It's better to show loader or nothing while redirecting
    return null; 
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <div className="flex flex-grow container mx-auto px-0 sm:px-4 py-8">
        <aside className="hidden md:block w-64 mr-8">
          <Card className="h-full shadow-md">
            <AdminNav />
          </Card>
        </aside>
        <main className="flex-1 bg-card p-6 rounded-lg shadow-md">
          {children}
        </main>
      </div>
       <footer className="py-4 text-center text-sm text-muted-foreground">
        Admin Panel © {new Date().getFullYear()} Granada Getaway
      </footer>
    </div>
  );
}

    