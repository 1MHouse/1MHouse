
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addRoom, updateRoom } from '@/lib/data';
import type { Room } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const roomFormSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters long."),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

interface RoomFormDialogProps {
  isOpen: boolean;
  onClose: (updated: boolean) => void;
  room?: Room; // For editing
}

export function RoomFormDialog({ isOpen, onClose, room }: RoomFormDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: room?.name || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: room?.name || '',
      });
    }
  }, [isOpen, room, form]);

  const onSubmit = async (data: RoomFormValues) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
    try {
      if (room) {
        updateRoom({ ...room, name: data.name });
        toast({ title: "Room Updated", description: "The room has been successfully updated." });
      } else {
        addRoom(data.name);
        toast({ title: "Room Added", description: "The new room has been successfully added." });
      }
      onClose(true);
    } catch (error) {
        toast({ title: "Error", description: "Failed to save room. Please try again.", variant: "destructive" });
        console.error("Failed to save room:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">{room ? 'Edit Room' : 'Add New Room'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sunrise Suite" {...field} />
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
                {room ? 'Save Changes' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    