
import type { Timestamp } from 'firebase/firestore';

export type BookingStatus = 'booked' | 'pending' | 'maintenance' | 'available';

export interface Location {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  locationId: string;
}

export interface Booking {
  id: string;
  roomId: string;
  startDate: Date; // Changed to Date
  endDate: Date;   // Changed to Date
  guestName: string;
  status: Exclude<BookingStatus, 'available'>;
}

// Helper type for Firestore data to ensure dates are Timestamps
export interface BookingDocument extends Omit<Booking, 'id' | 'startDate' | 'endDate'> {
  startDate: Timestamp;
  endDate: Timestamp;
}


export interface CalendarCellData {
  date: Date;
  roomId: string;
  status: BookingStatus;
  booking?: Booking; // This will use Date objects after conversion
}

