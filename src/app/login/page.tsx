
import { AdminLoginForm } from '@/components/auth/admin-login-form';
import { AppHeader } from '@/components/layout/app-header';

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <AppHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <AdminLoginForm />
      </main>
    </div>
  );
}

    