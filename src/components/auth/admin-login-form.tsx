
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label component is not directly used if using FormField with FormLabel
// import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// IMPORTANT: Guide user to use the email they set up in Firebase Authentication
const ADMIN_EMAIL_HINT = "admin@example.com"; // Replace if you want to display a different hint

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function AdminLoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading to avoid conflict with useAuth's isLoading
  const { login, isLoading: isAuthLoading } = useAuth(); // Get isAuthLoading from context
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '', // User should enter their admin email
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsSubmitting(true);
    const success = await login(data.email, data.password);
    setIsSubmitting(false);

    if (success) {
      toast({
        title: "Login Successful",
        description: "Welcome, Admin!",
      });
      // Check for redirect query parameter
      const queryParams = new URLSearchParams(window.location.search);
      const redirect = queryParams.get('redirect');
      router.push(redirect || '/admin');
    } else {
      // Specific error toasts are handled by the login function in AuthContext
      form.resetField("password");
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Admin Login</CardTitle>
        <CardDescription>Enter your admin credentials. Use the email address you set up in Firebase (e.g., {ADMIN_EMAIL_HINT}).</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isSubmitting || isAuthLoading}>
              {(isSubmitting || isAuthLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
            <Button variant="link" onClick={() => router.push('/')} className="w-full" type="button" disabled={isSubmitting || isAuthLoading}>
              Back to Homepage
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
