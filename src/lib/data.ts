
import type { Room, Booking } from '@/lib/types';
import { addDays, subDays } from 'date-fns';

// Ensure unique IDs for new bookings
let nextBookingId = 100;

export const initialRooms: Room[] = [
  { id: 'room1', name: 'Sunrise Suite' },
  { id: 'room2', name: 'Ocean View Deluxe' },
  { id: 'room3', name: 'Garden Retreat' },
  { id: 'room4', name: 'Mountain Hideaway' },
  { id: 'room5', name: 'City Lights Loft' },
];

export const initialBookings: Booking[] = [
  { 
    id: 'booking1', 
    roomId: 'room1', 
    startDate: subDays(new Date(), 2), 
    endDate: addDays(new Date(), 1), 
    guestName: 'Alice Wonderland', 
    status: 'booked' 
  },
  { 
    id: 'booking2', 
    roomId: 'room3', 
    startDate: new Date(), 
    endDate: addDays(new Date(), 3), 
    guestName: 'Bob The Builder', 
    status: 'pending' 
  },
  { 
    id: 'booking3', 
    roomId: 'room5', 
    startDate: addDays(new Date(), 2), 
    endDate: addDays(new Date(), 4), 
    guestName: 'Charlie Brown', 
    status: 'booked' 
  },
];

// In a real app, these would interact with a database / API
export const getRooms = (): Room[] => initialRooms;

export const getBookings = (): Booking[] => initialBookings;

export const addBooking = (booking: Omit<Booking, 'id'>): Booking => {
  const newBooking: Booking = { ...booking, id: `booking${nextBookingId++}` };
  initialBookings.push(newBooking);
  return newBooking;
};

export const updateBooking = (updatedBooking: Booking): Booking | undefined => {
  const index = initialBookings.findIndex(b => b.id === updatedBooking.id);
  if (index !== -1) {
    initialBookings[index] = updatedBooking;
    return initialBookings[index];
  }
  return undefined;
};

export const deleteBooking = (bookingId: string): boolean => {
  const index = initialBookings.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    initialBookings.splice(index, 1);
    return true;
  }
  return false;
};

export const addRoom = (roomName: string): Room => {
  const newRoom: Room = { id: `room${initialRooms.length + 1}`, name: roomName };
  initialRooms.push(newRoom);
  return newRoom;
};

export const updateRoom = (updatedRoom: Room): Room | undefined => {
    const index = initialRooms.findIndex(r => r.id === updatedRoom.id);
    if (index !== -1) {
        initialRooms[index] = updatedRoom;
        return initialRooms[index];
    }
    return undefined;
};

export const deleteRoom = (roomId: string): boolean => {
    const index = initialRooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
        initialRooms.splice(index, 1);
        return true;
    }
    return false;
};

    