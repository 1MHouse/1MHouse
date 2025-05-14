
import Link from 'next/link';
import { Hotel } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary hover:opacity-80 transition-opacity">
          <Hotel className="h-6 w-6" />
          <span>Granada Getaway</span>
        </Link>
        {/* Placeholder for potential future navigation or user actions */}
      </div>
    </header>
  );
}

    