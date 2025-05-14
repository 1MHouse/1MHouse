
"use client";

import { useEffect, useState }  from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addBooking, updateBooking } from '@/lib/data';
import type { Booking, Room } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const bookingStatusOptions = ['booked', 'pending', 'maintenance'] as const;

const bookingFormSchema = z.object({
  roomId: z.string().min(1, "Room selection is required."),
  guestName: z.string().min(1, "Guest name is required."),
  startDate: z.date({ required_error: "Start date is required."}),
  endDate: z.date({ required_error: "End date is required."}),
  status: z.enum(bookingStatusOptions),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be earlier than start date.",
  path: ["endDate"],
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export interface BookingFormDialogProps {
  isOpen: boolean;
  onClose: (updated: boolean) => void;
  booking?: Booking; // For editing
  rooms: Room[];
  defaultDate?: Date;
  defaultRoomId?: string;
}

export function BookingFormDialog({ isOpen, onClose, booking, rooms, defaultDate, defaultRoomId }: BookingFormDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: booking?.roomId || defaultRoomId || '',
      guestName: booking?.guestName || '',
      startDate: booking?.startDate ? (typeof booking.startDate === 'string' ? parseISO(booking.startDate) : booking.startDate) : defaultDate || new Date(),
      endDate: booking?.endDate ? (typeof booking.endDate === 'string' ? parseISO(booking.endDate) : booking.endDate) : defaultDate || new Date(),
      status: booking?.status || 'booked',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        roomId: booking?.roomId || defaultRoomId || rooms[0]?.id || '',
        guestName: booking?.guestName || '',
        startDate: booking?.startDate ? (typeof booking.startDate === 'string' ? parseISO(booking.startDate) : booking.startDate) : defaultDate || new Date(),
        endDate: booking?.endDate ? (typeof booking.endDate === 'string' ? parseISO(booking.endDate) : booking.endDate) : defaultDate || new Date(),
        status: booking?.status || 'booked',
      });
    }
  }, [isOpen, booking, rooms, defaultDate, defaultRoomId, form]);

  const onSubmit = async (data: BookingFormValues) => {
    setIsLoading(true);
    // Simulate API Call
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      if (booking) {
        updateBooking({ ...booking, ...data });
        toast({ title: "Booking Updated", description: "The booking has been successfully updated." });
      } else {
        addBooking(data);
        toast({ title: "Booking Created", description: "The new booking has been successfully created." });
      }
      onClose(true); // Signal that data was updated
    } catch (error) {
      toast({ title: "Error", description: "Failed to save booking. Please try again.", variant: "destructive" });
      console.error("Failed to save booking:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">{booking ? 'Edit Booking' : 'Add New Booking'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")} // Example past disable
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < (form.getValues("startDate") || new Date("1900-01-01"))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bookingStatusOptions.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {booking ? 'Save Changes' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    