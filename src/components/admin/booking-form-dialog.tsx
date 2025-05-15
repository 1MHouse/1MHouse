
"use client";

import { useEffect, useState }  from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
// AlertDialog might not be needed if overlap detection is removed or simplified
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addBooking, updateBooking } from '@/lib/data'; // getBookingsByRoomId removed for revert
import type { Booking, Room } from '@/lib/types';
import { format, parseISO } from 'date-fns'; // startOfDay, isWithinInterval might not be needed now
import { CalendarIcon, Loader2 } from 'lucide-react'; // AlertTriangle might not be needed
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Timestamp } from 'firebase/firestore'; 

const bookingStatusOptions = ['booked', 'pending', 'maintenance'] as const;

const ensureDateObject = (date: Date | Timestamp | undefined | string): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  if (typeof date === 'string') return parseISO(date);
  if (typeof (date as Timestamp).toDate === 'function') {
    return (date as Timestamp).toDate();
  }
  try {
    const parsed = new Date(date as any);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (e) { /* ignore */ }
  return undefined;
};

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
  booking?: Booking; 
  rooms: Room[]; 
  defaultDate?: Date;
  defaultRoomId?: string;
}

export function BookingFormDialog({ isOpen, onClose, booking, rooms, defaultDate, defaultRoomId }: BookingFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed state related to overlap alert

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: booking?.roomId || defaultRoomId || (rooms.length > 0 ? rooms[0].id : ''),
      guestName: booking?.guestName || '',
      startDate: ensureDateObject(booking?.startDate) || defaultDate || new Date(),
      endDate: ensureDateObject(booking?.endDate) || defaultDate || new Date(),
      status: booking?.status || 'booked',
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset({
        roomId: booking?.roomId || defaultRoomId || (rooms.length > 0 ? rooms[0].id : ''),
        guestName: booking?.guestName || '',
        startDate: ensureDateObject(booking?.startDate) || defaultDate || new Date(),
        endDate: ensureDateObject(booking?.endDate) || defaultDate || new Date(),
        status: booking?.status || 'booked',
      });
      setIsSubmitting(false);
      // Removed reset for overlap state
    }
  }, [isOpen, booking, rooms, defaultDate, defaultRoomId, form]);

  const onSubmit = async (data: BookingFormValues) => {
    console.log("[BookingFormDialog] onSubmit: Data submitted (reverted state):", data);
    
    if (rooms.length === 0 && !booking) {
        toast({ title: "Error", description: "No rooms available to book. Please add rooms first.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);

    // Original save logic without overlap check
    try {
      if (booking) { 
        const bookingToUpdate: Booking = {
          ...booking,
          ...data,
          startDate: data.startDate, 
          endDate: data.endDate,     
        };
        const success = await updateBooking(bookingToUpdate);
        if (success) {
          toast({ title: "Booking Updated", description: "The booking has been successfully updated." });
          onClose(true); 
        } else {
          toast({ title: "Error", description: "Failed to update booking. Please try again.", variant: "destructive" });
        }
      } else { 
        const newBookingData = {
          ...data,
          startDate: data.startDate,
          endDate: data.endDate,
        };
        const newBookingResult = await addBooking(newBookingData);
        if (newBookingResult) {
          toast({ title: "Booking Created", description: "The new booking has been successfully created." });
          onClose(true); 
        } else {
          toast({ title: "Error", description: "Failed to create booking. Please try again.", variant: "destructive" });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      console.error("Failed to save booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(false); }}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={rooms.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={rooms.length > 0 ? "Select a room" : "No rooms available"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rooms.length === 0 && <FormMessage>Please ensure rooms are available for the selected location/context.</FormMessage>}
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
                  <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || (rooms.length === 0 && !booking) }>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {booking ? 'Save Changes' : 'Create Booking'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* AlertDialog for overlap confirmation has been removed by this revert */}
    </>
  );
}

    