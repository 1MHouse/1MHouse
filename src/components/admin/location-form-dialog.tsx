
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addLocation, updateLocation } from '@/lib/data';
import type { Location } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const locationFormSchema = z.object({
  name: z.string().min(3, "Location name must be at least 3 characters long."),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormDialogProps {
  isOpen: boolean;
  onClose: (updated: boolean) => void;
  location?: Location; // For editing
}

export function LocationFormDialog({ isOpen, onClose, location }: LocationFormDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: location?.name || '',
      });
    }
  }, [isOpen, location, form]);

  const onSubmit = async (data: LocationFormValues) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
    try {
      if (location) {
        updateLocation({ ...location, name: data.name });
        toast({ title: "Location Updated", description: "The location has been successfully updated." });
      } else {
        addLocation(data.name);
        toast({ title: "Location Added", description: "The new location has been successfully added." });
      }
      onClose(true);
    } catch (error) {
        toast({ title: "Error", description: "Failed to save location. Please try again.", variant: "destructive" });
        console.error("Failed to save location:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">{location ? 'Edit Location' : 'Add New Location'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Granada City Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {location ? 'Save Changes' : 'Add Location'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
