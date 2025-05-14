
import type { Timestamp } from 'firebase/firestore';

export type BookingStatus = 'booked' | 'pending' | 'maintenance' | 'available';

export interface Location {
  id: string; // Firestore document ID
  name: string;
}

export interface Room {
  id: string; // Firestore document ID
  name: string;
  locationId: string;
}

// This is how booking data is stored in Firestore
export interface BookingDocument {
  roomId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  guestName: string;
  status: Exclude<BookingStatus, 'available'>;
}

// This is how booking data is used in the client (with JS Dates)
export interface Booking extends Omit<BookingDocument, 'startDate' | 'endDate'> {
  id: string; // Firestore document ID
  startDate: Date;
  endDate: Date;
}

export interface CalendarCellData {
  date: Date;
  roomId: string;
  status: BookingStatus;
  booking?: Booking;
}
