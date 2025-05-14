
"use client";

import type { Room, Booking, BookingStatus, CalendarCellData, Location as LocationType } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { 
  addDays, 
  startOfWeek, 
  format, 
  isWithinInterval, 
  isSameDay,
} from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

const BookingFormDialog = React.lazy(() => import('@/components/admin/booking-form-dialog').then(module => ({ default: module.BookingFormDialog })));
import React from "react";


interface AvailabilityCalendarProps {
  rooms: Room[]; // These are pre-filtered rooms for the selected location
  initialBookings: Booking[]; // These are pre-filtered bookings for the selected location
  currentDisplayDate: Date;
  onBookingUpdate: () => void;
  allRooms: Room[]; // All rooms from all locations, for the booking dialog if admin needs broader context
  allLocations: LocationType[]; // All locations
}

const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case "booked":
      return "bg-destructive/70 text-destructive-foreground";
    case "pending":
      return "bg-yellow-400/70 text-yellow-foreground"; 
    case "maintenance":
      return "bg-muted-foreground/70 text-muted";
    case "available":
      return "bg-green-500/10 hover:bg-green-500/20";
    default:
      return "bg-background";
  }
};

export function AvailabilityCalendar({ 
  rooms, 
  initialBookings, 
  currentDisplayDate, 
  onBookingUpdate,
  allRooms, // Note: allRooms might be used if dialog needs to show rooms beyond current location context
  allLocations 
}: AvailabilityCalendarProps) {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [isMounted, setIsMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>(undefined);
  const [selectedCellData, setSelectedCellData] = useState<{ roomId: string, date: Date } | undefined>(undefined);

  useEffect(() => {
    setIsMounted(true);
    setBookings(initialBookings); 
  }, [initialBookings]);

  const daysToShow = 7;
  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; // Monday

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDisplayDate, { weekStartsOn });
    return Array.from({ length: daysToShow }).map((_, i) => addDays(start, i));
  }, [currentDisplayDate]);

  const calendarData = useMemo(() => {
    // 'rooms' prop is already filtered for the current location by HomePage
    return rooms.map(room => {
      const row: CalendarCellData[] = weekDays.map(date => {
        // 'bookings' prop is already filtered for the current location's rooms by HomePage
        const dayBookings = bookings.filter(
          booking =>
            booking.roomId === room.id &&
            isWithinInterval(date, { start: booking.startDate, end: booking.endDate }) &&
            (isSameDay(date, booking.startDate) || isSameDay(date, booking.endDate) || 
             (date > booking.startDate && date < booking.endDate))
        );
        
        let cellStatus: BookingStatus = "available";
        let relevantBooking: Booking | undefined = undefined;

        if (dayBookings.length > 0) {
          if (dayBookings.some(b => b.status === 'booked')) {
            cellStatus = 'booked';
            relevantBooking = dayBookings.find(b => b.status === 'booked');
          } else if (dayBookings.some(b => b.status === 'pending')) {
            cellStatus = 'pending';
            relevantBooking = dayBookings.find(b => b.status === 'pending');
          } else if (dayBookings.some(b => b.status === 'maintenance')) {
            cellStatus = 'maintenance';
            relevantBooking = dayBookings.find(b => b.status === 'maintenance');
          }
        }
        
        return {
          date,
          roomId: room.id,
          status: cellStatus,
          booking: relevantBooking,
        };
      });
      return { room, row };
    });
  }, [rooms, bookings, weekDays]);

  const handleCellClick = (cellData: CalendarCellData) => {
    if (!isAdmin) return;
    setSelectedBooking(cellData.booking); 
    setSelectedCellData({ roomId: cellData.roomId, date: cellData.date });
    setDialogOpen(true);
  };

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false);
    setSelectedBooking(undefined);
    setSelectedCellData(undefined);
    if (updated) {
      onBookingUpdate(); 
    }
  };
  
  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 text-center text-muted-foreground">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  if (rooms.length === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Room Availability</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center text-muted-foreground">
          No rooms available for this location. Admins can add rooms in the 'Admin Panel'.
        </CardContent>
      </Card>
     );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Room Availability</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border border-t border-b">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-40">
                    Room
                  </th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">
                      <div>{format(day, "EEE")}</div>
                      <div>{format(day, "MMM d")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {calendarData.map(({ room, row }) => (
                  <tr key={room.id}>
                    <td className="sticky left-0 z-10 bg-background px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground w-40">
                      {room.name}
                    </td>
                    {row.map(cell => (
                      <td
                        key={`${room.id}-${cell.date.toISOString()}`}
                        className={`px-1 py-1 h-16 min-w-[120px] text-center align-top border-l ${isAdmin && cell.status === 'available' ? 'cursor-pointer' : ''} ${isAdmin && cell.booking ? 'cursor-pointer' : ''} ${getStatusColor(cell.status)}`}
                        onClick={() => isAdmin && (cell.status === 'available' || cell.booking) && handleCellClick(cell)}
                        title={cell.booking ? `${cell.booking.guestName} (${cell.status})` : cell.status}
                      >
                        <div className="flex flex-col items-center justify-center h-full p-1 text-xs">
                          {cell.booking && (
                            <>
                              <span className="font-semibold truncate max-w-[100px]">{cell.booking.guestName}</span>
                              <Badge variant={cell.status === 'booked' ? 'destructive' : cell.status === 'pending' ? 'secondary' : 'outline'} className="mt-1 text-xs">
                                {cell.status}
                              </Badge>
                            </>
                          )}
                          {cell.status === 'available' && isAdmin && (
                             <span className="text-muted-foreground italic">Available</span>
                          )}
                           {cell.status === 'available' && !isAdmin && (
                             <span className="text-green-700">Available</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
      {isAdmin && isMounted && (
        <React.Suspense fallback={<div>Loading booking form...</div>}>
          <BookingFormDialog
            isOpen={dialogOpen}
            onClose={handleDialogClose}
            booking={selectedBooking}
            rooms={rooms} // Pass only rooms for the current location for adding/editing from calendar
            defaultDate={selectedCellData?.date}
            defaultRoomId={selectedCellData?.roomId}
          />
        </React.Suspense>
      )}
    </Card>
  );
}
