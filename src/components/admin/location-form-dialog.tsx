
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
  location?: Location; 
}

export function LocationFormDialog({ isOpen, onClose, location }: LocationFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Reset submitting state when dialog opens/location changes
      setIsSubmitting(false); 
    }
  }, [isOpen, location, form]);

  const onSubmit = async (data: LocationFormValues) => {
    setIsSubmitting(true);
    try {
      if (location) {
        const success = await updateLocation({ ...location, name: data.name });
        if (success) {
          toast({ title: "Location Updated", description: "The location has been successfully updated." });
          onClose(true);
        } else {
          toast({ title: "Error", description: "Failed to update location. Please try again.", variant: "destructive" });
        }
      } else {
        const newLocation = await addLocation(data.name);
        if (newLocation) {
          toast({ title: "Location Added", description: "The new location has been successfully added." });
          onClose(true);
        } else {
          toast({ title: "Error", description: "Failed to add location. Please try again.", variant: "destructive" });
        }
      }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
        console.error("Failed to save location:", error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(false); }}>
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
                <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {location ? 'Save Changes' : 'Add Location'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
