
"use client";

import type { Room, Booking, BookingStatus, CalendarCellData, Location as LocationType } from "@/lib/types";
import type { Timestamp } from 'firebase/firestore'; // Explicit import
import { useState, useEffect, useMemo } from "react";
import {
  addDays,
  startOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay // Added for clarity in date comparisons
} from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import React from "react";

const BookingFormDialog = React.lazy(() =>
  import('@/components/admin/booking-form-dialog').then(module => ({ default: module.BookingFormDialog }))
);


interface AvailabilityCalendarProps {
  rooms: Room[];
  initialBookings: Booking[]; // Booking type now has startDate/endDate as strictly Date
  currentDisplayDate: Date;
  onBookingUpdate: () => void;
  allRooms: Room[]; // All rooms for the current location context, for the dialog
  allLocations: LocationType[]; // All locations for the dialog if needed
}

// Helper function to ensure date values are JavaScript Date objects
const ensureDateObject = (dateValue: Date | Timestamp | string | undefined): Date => {
  if (dateValue instanceof Date) {
    return startOfDay(dateValue); // Normalize to start of day
  }
  if (typeof dateValue === 'string') {
    try {
      return startOfDay(parseISO(dateValue)); // Normalize to start of day
    } catch (e) {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) return startOfDay(parsed); // Normalize
      console.warn("[AvailabilityCalendar] Failed to parse date string with parseISO and new Date():", dateValue);
      return startOfDay(new Date()); // Normalize
    }
  }
  if (dateValue && typeof (dateValue as Timestamp).toDate === 'function') {
    return startOfDay((dateValue as Timestamp).toDate()); // Normalize to start of day
  }
  if (dateValue === undefined) {
    console.warn("[AvailabilityCalendar] ensureDateObject received undefined, returning current date as fallback.");
    return startOfDay(new Date()); // Normalize
  }
  console.warn("[AvailabilityCalendar] Unexpected date type in ensureDateObject, attempting direct conversion:", dateValue);
  const parsedAttempt = new Date(dateValue as any);
  if (!isNaN(parsedAttempt.getTime())) return startOfDay(parsedAttempt); // Normalize

  console.error("[AvailabilityCalendar] Critical error: could not convert date value to Date object:", dateValue);
  return startOfDay(new Date()); // Normalize
};


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
  allRooms, // These are rooms from the current location, useful for passing to BookingFormDialog
  allLocations
}: AvailabilityCalendarProps) {
  const { isAdmin } = useAuth();

  // `initialBookings` should now arrive with Date objects due to stricter Booking type
  // and conversion in `data.ts`. We normalize them to startOfDay for consistent comparison.
  const processedInitialBookings = useMemo(() =>
    initialBookings.map(b => ({
      ...b,
      startDate: startOfDay(b.startDate), // startDate is already Date
      endDate: startOfDay(b.endDate),     // endDate is already Date
    })), [initialBookings]);

  const [bookings, setBookings] = useState<Booking[]>(processedInitialBookings);
  const [isMounted, setIsMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>(undefined);
  const [selectedCellData, setSelectedCellData] = useState<{ roomId: string, date: Date } | undefined>(undefined);

  useEffect(() => {
    setIsMounted(true);
    // Process initialBookings when component mounts or when initialBookings prop changes
    setBookings(
        initialBookings.map(b => ({
        ...b,
        startDate: startOfDay(b.startDate), // Ensure normalization
        endDate: startOfDay(b.endDate),     // Ensure normalization
        }))
    );
  }, [initialBookings]);

  const daysToShow = 7;
  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; // Monday

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDisplayDate, { weekStartsOn });
    return Array.from({ length: daysToShow }).map((_, i) => startOfDay(addDays(start, i))); // Normalize cell dates
  }, [currentDisplayDate]);

  const calendarData = useMemo(() => {
    // currentBookings now comes from the `bookings` state, which has Date objects normalized to startOfDay
    const currentBookings = bookings;

    return rooms.map(room => {
      const row: CalendarCellData[] = weekDays.map(date => { // `date` here is already startOfDay
        const dayBookings = currentBookings.filter(
          booking =>
            booking.roomId === room.id &&
            // `booking.startDate` and `booking.endDate` are Date objects (startOfDay)
            // `date` is also Date object (startOfDay)
            isWithinInterval(date, { start: booking.startDate, end: booking.endDate })
        );

        let cellStatus: BookingStatus = "available";
        let relevantBooking: Booking | undefined = undefined;

        if (dayBookings.length > 0) {
          if (dayBookings.some(b => b.status === 'booked')) {
            cellStatus = 'booked';
            relevantBooking = dayBookings.find(b => b.status === 'booked');
          } else if (dayBookings.some(b => b.status === 'maintenance')) {
            cellStatus = 'maintenance';
            relevantBooking = dayBookings.find(b => b.status === 'maintenance');
          } else if (dayBookings.some(b => b.status === 'pending')) {
            cellStatus = 'pending';
            relevantBooking = dayBookings.find(b => b.status === 'pending');
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
            rooms={allRooms} // Pass current location's rooms to the dialog
            defaultDate={selectedCellData?.date}
            defaultRoomId={selectedCellData?.roomId}
          />
        </React.Suspense>
      )}
    </Card>
  );
}

