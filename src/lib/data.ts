
import type { Room, Booking, Location } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// In-memory data store
let locationsDB: Location[] = [
  { id: 'loc1', name: 'Granada, Spain' },
  { id: 'loc2', name: 'Second Location (Coming Soon)' },
];

let roomsDB: Room[] = [
  { id: 'room1', name: 'Sunrise Suite', locationId: 'loc1' },
  { id: 'room2', name: 'Ocean View Deluxe', locationId: 'loc1' },
  { id: 'room3', name: 'Garden Retreat', locationId: 'loc1' },
];

let bookingsDB: Booking[] = [
  {
    id: 'booking1',
    roomId: 'room1',
    guestName: 'Alice Wonderland',
    startDate: new Date(new Date().setDate(new Date().getDate() - 2)),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    status: 'booked',
  },
  {
    id: 'booking2',
    roomId: 'room2',
    guestName: 'Bob The Builder',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    status: 'pending',
  },
];

// --- Location Functions ---
export const getLocations = (): Location[] => {
  console.log("[data.ts - InMem] getLocations called");
  return [...locationsDB];
};

export const addLocation = (name: string): Location => {
  console.log(`[data.ts - InMem] addLocation called with name: ${name}`);
  const newLocation: Location = { id: uuidv4(), name };
  locationsDB.push(newLocation);
  return newLocation;
};

export const updateLocation = (updatedLocation: Location): Location | undefined => {
  console.log(`[data.ts - InMem] updateLocation called with:`, updatedLocation);
  const index = locationsDB.findIndex(loc => loc.id === updatedLocation.id);
  if (index !== -1) {
    locationsDB[index] = updatedLocation;
    return locationsDB[index];
  }
  console.warn(`[data.ts - InMem] updateLocation: Location with id ${updatedLocation.id} not found.`);
  return undefined;
};

export const deleteLocation = (locationId: string): boolean => {
  console.log(`[data.ts - InMem] deleteLocation called for ID: ${locationId}`);
  const hasRooms = roomsDB.some(room => room.locationId === locationId);
  if (hasRooms) {
    console.warn(`[data.ts - InMem] Cannot delete location ${locationId} as it has associated rooms.`);
    return false;
  }
  const initialLength = locationsDB.length;
  locationsDB = locationsDB.filter(loc => loc.id !== locationId);
  return locationsDB.length < initialLength;
};

// --- Room Functions ---
export const getRooms = (locationId?: string): Room[] => {
  console.log(`[data.ts - InMem] getRooms called ${locationId ? `for location ${locationId}` : '(all rooms)'}`);
  if (locationId) {
    return [...roomsDB.filter(room => room.locationId === locationId)];
  }
  return [...roomsDB];
};

export const addRoom = (name: string, locationId: string): Room => {
  console.log(`[data.ts - InMem] addRoom called with name: ${name}, locationId: ${locationId}`);
  const newRoom: Room = { id: uuidv4(), name, locationId };
  roomsDB.push(newRoom);
  return newRoom;
};

export const updateRoom = (updatedRoom: Room): Room | undefined => {
  console.log(`[data.ts - InMem] updateRoom called with:`, updatedRoom);
  const index = roomsDB.findIndex(room => room.id === updatedRoom.id);
  if (index !== -1) {
    roomsDB[index] = updatedRoom;
    return roomsDB[index];
  }
  console.warn(`[data.ts - InMem] updateRoom: Room with id ${updatedRoom.id} not found.`);
  return undefined;
};

export const deleteRoom = (roomId: string): boolean => {
  console.log(`[data.ts - InMem] deleteRoom called for ID: ${roomId}`);
  const hasBookings = bookingsDB.some(booking => booking.roomId === roomId);
  if (hasBookings) {
     console.warn(`[data.ts - InMem] Cannot delete room ${roomId} as it has associated bookings.`);
    return false;
  }
  const initialLength = roomsDB.length;
  roomsDB = roomsDB.filter(room => room.id !== roomId);
  return roomsDB.length < initialLength;
};

// --- Booking Functions ---
export const getBookings = (roomId?: string): Booking[] => {
  console.log(`[data.ts - InMem] getBookings called ${roomId ? `for room ID: ${roomId}` : '(all bookings)'}`);
    if (roomId) {
    return [...bookingsDB.filter(booking => booking.roomId === roomId)];
  }
  return [...bookingsDB];
};

export const getBookingsByLocation = (locationId: string): Booking[] => {
    console.log(`[data.ts - InMem] getBookingsByLocation called for location ${locationId}`);
    const locationRooms = getRooms(locationId);
    const roomIds = locationRooms.map(room => room.id);
    return [...bookingsDB.filter(booking => roomIds.includes(booking.roomId))];
};

export const addBooking = (bookingData: Omit<Booking, 'id'>): Booking => {
  console.log(`[data.ts - InMem] addBooking called with:`, bookingData);
  const newBooking: Booking = { ...bookingData, id: uuidv4() };
  bookingsDB.push(newBooking);
  return newBooking;
};

export const updateBooking = (updatedBooking: Booking): Booking | undefined => {
  console.log(`[data.ts - InMem] updateBooking called with:`, updatedBooking);
  const index = bookingsDB.findIndex(b => b.id === updatedBooking.id);
  if (index !== -1) {
    bookingsDB[index] = updatedBooking;
    return bookingsDB[index];
  }
  console.warn(`[data.ts - InMem] updateBooking: Booking with id ${updatedBooking.id} not found.`);
  return undefined;
};

export const deleteBooking = (bookingId: string): boolean => {
  console.log(`[data.ts - InMem] deleteBooking called for ID: ${bookingId}`);
  const initialLength = bookingsDB.length;
  bookingsDB = bookingsDB.filter(b => b.id !== bookingId);
  return bookingsDB.length < initialLength;
};

// This function is a no-op for the in-memory version.
// Data is initialized with the arrays at the top of this file.
// It's kept for potential compatibility if components still call it.
export const seedInitialData = () => {
  console.log("[data.ts - InMem] seedInitialData called (no-op for in-memory store).");
};
