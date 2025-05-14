
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
  startDate: Date;
  endDate: Date;
  guestName: string;
  status: Exclude<BookingStatus, 'available'>; // 'available' is not a booking status, but a cell state
}

export interface CalendarCellData {
  date: Date;
  roomId: string;
  status: BookingStatus;
  booking?: Booking;
}
