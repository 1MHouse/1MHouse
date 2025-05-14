
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a clean, readable font
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from "@/components/ui/toaster"; // ShadCN Toaster

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // CSS variable for Inter font
});

export const metadata: Metadata = {
  title: '1M House',
  description: 'Manage your 1M House bookings and availability.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
