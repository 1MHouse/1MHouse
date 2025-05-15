
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Booking, Room, Location } from '@/lib/types';
import { getBookings, deleteBooking as deleteBookingData, getRooms, getLocations } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // parseISO added for safety
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import React from 'react';

const BookingFormDialog = React.lazy(() => 
  import('./booking-form-dialog').then(module => ({ default: module.BookingFormDialog }))
);

export function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>(undefined);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    console.log("[BookingManagement] fetchData: Fetching bookings, rooms, and locations...");
    setIsLoading(true);
    try {
      const [fetchedBookings, fetchedRooms, fetchedLocations] = await Promise.all([
        getBookings(),
        getRooms(), 
        getLocations()
      ]);
      setBookings(fetchedBookings.map(b => ({ // Ensure dates are Date objects
        ...b,
        startDate: b.startDate instanceof Date ? b.startDate : parseISO(b.startDate as unknown as string),
        endDate: b.endDate instanceof Date ? b.endDate : parseISO(b.endDate as unknown as string),
      })));
      setRooms(fetchedRooms);
      setLocations(fetchedLocations);
      console.log(`[BookingManagement] fetchData: Fetched ${fetchedBookings.length} bookings, ${fetchedRooms.length} rooms, ${fetchedLocations.length} locations.`);
    } catch (error) {
      console.error("[BookingManagement] fetchData: Error fetching data:", error);
      toast({ title: "Error", description: "Failed to fetch necessary data.", variant: "destructive" });
      setBookings([]);
      setRooms([]);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, [fetchData]);

  const handleAddBooking = () => {
    if (rooms.length === 0) {
      toast({ title: "No Rooms Available", description: "Please add rooms before creating bookings.", variant: "destructive" });
      return;
    }
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
      setIsLoading(true); // Indicate loading for the delete operation
      try {
        const success = await deleteBookingData(bookingToDelete);
        if (success) {
          toast({ title: "Booking Deleted", description: "The booking has been successfully deleted." });
          fetchData(); 
        } else {
          toast({ title: "Error", description: "Failed to delete booking.", variant: "destructive" });
        }
      } catch (error) {
        console.error("[BookingManagement] confirmDelete: Error deleting booking:", error);
        toast({ title: "Error", description: "An unexpected error occurred while deleting the booking.", variant: "destructive" });
      } finally {
        setBookingToDelete(null);
        setIsLoading(false); 
        setIsAlertOpen(false);
      }
    } else {
      setIsAlertOpen(false);
    }
  };

  const handleFormClose = (updated: boolean) => {
    setIsFormOpen(false);
    setSelectedBooking(undefined);
    if (updated) {
      fetchData(); 
    }
  };

  const getRoomInfo = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return { roomName: 'Unknown Room', locationName: 'Unknown Location' };
    const location = locations.find(l => l.id === room.locationId);
    return {
      roomName: room.name,
      locationName: location?.name || 'Unknown Location'
    };
  };

  if (!isMounted || (isLoading && bookings.length === 0 && rooms.length === 0 && locations.length === 0) ) {
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
        <Button onClick={handleAddBooking} disabled={rooms.length === 0 || isLoading}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Booking
        </Button>
      </div>
      {isLoading && (bookings.length > 0 || rooms.length > 0 || locations.length > 0) && ( 
        <div className="flex items-center justify-start py-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Refreshing data...</span>
        </div>
      )}
      {!isLoading && rooms.length === 0 && (
         <p className="text-destructive text-center py-4">No rooms available in any location. Please add rooms first in the 'Rooms' section.</p>
      )}

      {!isLoading && bookings.length === 0 && rooms.length > 0 ? (
        <p className="text-muted-foreground text-center py-4">No bookings found. Add a new booking to get started.</p>
      ) : !isLoading && bookings.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest Name</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => {
              const { roomName, locationName } = getRoomInfo(booking.roomId);
              const startDate = booking.startDate instanceof Date ? booking.startDate : parseISO(booking.startDate as unknown as string);
              const endDate = booking.endDate instanceof Date ? booking.endDate : parseISO(booking.endDate as unknown as string);
              return (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.guestName}</TableCell>
                  <TableCell>{roomName}</TableCell>
                  <TableCell>{locationName}</TableCell>
                  <TableCell>
                    {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={booking.status === 'booked' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'} 
                          className={cn(
                              booking.status === 'booked' && 'bg-primary text-primary-foreground', 
                              booking.status === 'pending' && 'bg-yellow-400 text-black',
                              booking.status === 'maintenance' && 'bg-gray-500 text-white'
                          )}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading}>
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditBooking(booking)} disabled={isLoading}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteBooking(booking.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isLoading}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
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
            <AlertDialogCancel onClick={() => {setBookingToDelete(null); setIsAlertOpen(false);}} disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isLoading}>
              {isLoading && bookingToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
