
import type { Room, Booking, Location } from '@/lib/types';
import { addDays, subDays } from 'date-fns';

let nextBookingId = 100;
let nextRoomId = 6; // Assuming 5 initial rooms
let nextLocationId = 3; // Assuming 2 initial locations

export const initialLocations: Location[] = [
  { id: 'loc1', name: 'Granada, Spain' },
  { id: 'loc2', name: 'Second Location (Coming Soon)' },
];

export const initialRooms: Room[] = [
  { id: 'room1', name: 'Sunrise Suite', locationId: 'loc1' },
  { id: 'room2', name: 'Ocean View Deluxe', locationId: 'loc1' },
  { id: 'room3', name: 'Garden Retreat', locationId: 'loc1' },
  { id: 'room4', name: 'Mountain Hideaway', locationId: 'loc1' },
  { id: 'room5', name: 'City Lights Loft', locationId: 'loc1' },
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

// Location Functions
export const getLocations = (): Location[] => [...initialLocations];

export const addLocation = (name: string): Location => {
  const newLocation: Location = { id: `loc${nextLocationId++}`, name };
  initialLocations.push(newLocation);
  return newLocation;
};

export const updateLocation = (updatedLocation: Location): Location | undefined => {
  const index = initialLocations.findIndex(l => l.id === updatedLocation.id);
  if (index !== -1) {
    initialLocations[index] = updatedLocation;
    return initialLocations[index];
  }
  return undefined;
};

export const deleteLocation = (locationId: string): boolean => {
  // Prevent deletion if rooms are associated with this location
  const hasRooms = initialRooms.some(room => room.locationId === locationId);
  if (hasRooms) {
    console.warn(`Cannot delete location ${locationId} as it has associated rooms.`);
    return false; // Or throw an error
  }
  const index = initialLocations.findIndex(l => l.id === locationId);
  if (index !== -1) {
    initialLocations.splice(index, 1);
    return true;
  }
  return false;
};


// Room Functions
export const getRooms = (locationId?: string): Room[] => {
  const allRooms = [...initialRooms];
  if (locationId) {
    return allRooms.filter(room => room.locationId === locationId);
  }
  return allRooms;
};

export const addRoom = (name: string, locationId: string): Room => {
  const newRoom: Room = { id: `room${nextRoomId++}`, name, locationId };
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
    // Prevent deletion if bookings are associated with this room
    const hasBookings = initialBookings.some(booking => booking.roomId === roomId);
    if (hasBookings) {
      console.warn(`Cannot delete room ${roomId} as it has associated bookings.`);
      return false; // Or throw an error
    }
    const index = initialRooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
        initialRooms.splice(index, 1);
        return true;
    }
    return false;
};

// Booking Functions
export const getBookings = (): Booking[] => [...initialBookings];

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
