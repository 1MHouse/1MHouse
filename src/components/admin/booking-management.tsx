
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Booking, Room } from '@/lib/types';
import { getBookings, deleteBooking as deleteBookingData, getRooms } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Dynamic import for BookingFormDialog
const BookingFormDialog = React.lazy(() => import('./booking-form-dialog').then(module => ({ default: module.BookingFormDialog })));
import React from 'react'; // Required for React.lazy

export function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>(undefined);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBookingsAndRooms = useCallback(async () => {
    setIsLoading(true);
    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 300));
    setBookings([...getBookings()]);
    setRooms(getRooms());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchBookingsAndRooms();
  }, [fetchBookingsAndRooms]);

  const handleAddBooking = () => {
    setSelectedBooking(undefined);
    setIsFormOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsFormOpen(true);
  };

  const handleDeleteBooking = (bookingId: string) => {
    setBookingToDelete(bookingId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (bookingToDelete) {
      // Simulate API Call
      await new Promise(resolve => setTimeout(resolve, 300));
      const success = deleteBookingData(bookingToDelete);
      if (success) {
        toast({ title: "Booking Deleted", description: "The booking has been successfully deleted." });
        fetchBookingsAndRooms(); // Refresh list
      } else {
        toast({ title: "Error", description: "Failed to delete booking.", variant: "destructive" });
      }
      setBookingToDelete(null);
    }
    setIsAlertOpen(false);
  };

  const handleFormClose = (updated: boolean) => {
    setIsFormOpen(false);
    setSelectedBooking(undefined);
    if (updated) {
      fetchBookingsAndRooms(); // Refresh list if data was updated
    }
  };

  const getRoomName = (roomId: string) => rooms.find(r => r.id === roomId)?.name || 'Unknown Room';

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading bookings...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Manage Bookings</h2>
        <Button onClick={handleAddBooking}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Booking
        </Button>
      </div>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No bookings found. Add a new booking to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest Name</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.guestName}</TableCell>
                <TableCell>{getRoomName(booking.roomId)}</TableCell>
                <TableCell>
                  {format(booking.startDate, "MMM d, yyyy")} - {format(booking.endDate, "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={booking.status === 'booked' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'} 
                         className={cn(
                            booking.status === 'booked' && 'bg-primary text-primary-foreground', 
                            booking.status === 'pending' && 'bg-yellow-400 text-black', // Using specific color for better visibility
                            booking.status === 'maintenance' && 'bg-gray-500 text-white'
                         )}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditBooking(booking)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteBooking(booking.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isMounted && (
        <React.Suspense fallback={<div>Loading form...</div>}>
          <BookingFormDialog
            isOpen={isFormOpen}
            onClose={handleFormClose}
            booking={selectedBooking}
            rooms={rooms}
          />
        </React.Suspense>
      )}
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({variant: "destructive"})}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper for AlertDialog Action button styling
const buttonVariants = ({variant}: {variant?: "destructive" | "default"}) => {
  if (variant === "destructive") return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  return "";
}

    