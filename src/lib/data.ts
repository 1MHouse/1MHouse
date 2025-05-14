
import type { Room, Booking, Location, BookingDocument } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  writeBatch,
  getDoc,
} from 'firebase/firestore';

// Helper to convert Firestore booking doc to client-side Booking
const bookingFromDoc = (id: string, data: BookingDocument): Booking => ({
  id,
  ...data,
  startDate: data.startDate.toDate(),
  endDate: data.endDate.toDate(),
});

// Helper to convert client-side Booking data for Firestore
const bookingToDocData = (bookingData: Omit<Booking, 'id'> | Omit<BookingDocument, 'startDate' | 'endDate'> & { startDate: Date, endDate: Date }): BookingDocument => ({
  ...bookingData,
  startDate: Timestamp.fromDate(new Date(bookingData.startDate)),
  endDate: Timestamp.fromDate(new Date(bookingData.endDate)),
});


// --- Location Functions ---
const locationsCollection = collection(db, 'locations');

export const getLocations = async (): Promise<Location[]> => {
  try {
    const snapshot = await getDocs(locationsCollection);
    if (snapshot.empty) {
      // Optional: Seed initial data if collection is empty
      // console.log("No locations found. Seeding initial location...");
      // await addDoc(locationsCollection, { name: 'Granada, Spain' });
      // await addDoc(locationsCollection, { name: 'Second Location (Coming Soon)' });
      // const newSnapshot = await getDocs(locationsCollection);
      // return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
  } catch (error) {
    console.error("Error fetching locations: ", error);
    return [];
  }
};

export const addLocation = async (name: string): Promise<Location> => {
  const docRef = await addDoc(locationsCollection, { name });
  return { id: docRef.id, name };
};

export const updateLocation = async (updatedLocation: Location): Promise<Location | undefined> => {
  const locationDoc = doc(db, 'locations', updatedLocation.id);
  await updateDoc(locationDoc, { name: updatedLocation.name });
  return updatedLocation;
};

export const deleteLocation = async (locationId: string): Promise<boolean> => {
  // Check if rooms are associated with this location
  const roomsSnapshot = await getDocs(query(roomsCollection, where('locationId', '==', locationId)));
  if (!roomsSnapshot.empty) {
    console.warn(`Cannot delete location ${locationId} as it has associated rooms.`);
    // You might want to throw an error or return a specific status
    return false;
  }
  const locationDoc = doc(db, 'locations', locationId);
  await deleteDoc(locationDoc);
  return true;
};

// --- Room Functions ---
const roomsCollection = collection(db, 'rooms');

export const getRooms = async (locationId?: string): Promise<Room[]> => {
  try {
    let q = query(roomsCollection);
    if (locationId) {
      q = query(roomsCollection, where('locationId', '==', locationId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  } catch (error) {
    console.error("Error fetching rooms: ", error);
    return [];
  }
};

export const addRoom = async (name: string, locationId: string): Promise<Room> => {
  const docRef = await addDoc(roomsCollection, { name, locationId });
  return { id: docRef.id, name, locationId };
};

export const updateRoom = async (updatedRoom: Room): Promise<Room | undefined> => {
  const roomDoc = doc(db, 'rooms', updatedRoom.id);
  await updateDoc(roomDoc, { name: updatedRoom.name, locationId: updatedRoom.locationId });
  return updatedRoom;
};

export const deleteRoom = async (roomId: string): Promise<boolean> => {
  // Check if bookings are associated with this room
  const bookingsSnapshot = await getDocs(query(bookingsCollection, where('roomId', '==', roomId)));
  if (!bookingsSnapshot.empty) {
    console.warn(`Cannot delete room ${roomId} as it has associated bookings.`);
    return false;
  }
  const roomDoc = doc(db, 'rooms', roomId);
  await deleteDoc(roomDoc);
  return true;
};

// --- Booking Functions ---
const bookingsCollection = collection(db, 'bookings');

export const getBookings = async (roomId?: string): Promise<Booking[]> => {
  try {
    let q = query(bookingsCollection);
    if (roomId) {
      q = query(bookingsCollection, where('roomId', '==', roomId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => bookingFromDoc(doc.id, doc.data() as BookingDocument));
  } catch (error) {
    console.error("Error fetching bookings: ", error);
    return [];
  }
};

// Used by HomePage to get all bookings for rooms within a specific location
export const getBookingsByLocation = async (locationId: string): Promise<Booking[]> => {
  try {
    const locationRooms = await getRooms(locationId);
    if (locationRooms.length === 0) return [];

    const roomIds = locationRooms.map(room => room.id);
    
    // Firestore 'in' query supports up to 30 elements in the array
    // For more than 30 rooms, you'd need multiple queries or a different data model
    if (roomIds.length > 30) {
        console.warn("Querying bookings for more than 30 rooms, this might be slow or fail. Consider restructuring.");
        // Fallback or chunking needed here for > 30 roomIds
    }
    if (roomIds.length === 0) return []; // Avoid empty 'in' query

    const q = query(bookingsCollection, where('roomId', 'in', roomIds));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => bookingFromDoc(docSnapshot.id, docSnapshot.data() as BookingDocument));
  } catch (error) {
    console.error("Error fetching bookings by location:", error);
    return [];
  }
};


export const addBooking = async (bookingData: Omit<Booking, 'id'>): Promise<Booking> => {
  const docData = bookingToDocData(bookingData);
  const docRef = await addDoc(bookingsCollection, docData);
  return { ...bookingData, id: docRef.id };
};

export const updateBooking = async (bookingData: Booking): Promise<Booking | undefined> => {
  const bookingDoc = doc(db, 'bookings', bookingData.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...docDataContent } = bookingData; // Exclude id from data to be written
  const firestoreDocData = bookingToDocData(docDataContent);
  await updateDoc(bookingDoc, firestoreDocData);
  return bookingData;
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  const bookingDoc = doc(db, 'bookings', bookingId);
  await deleteDoc(bookingDoc);
  return true;
};

// --- Initial Data Seeding (Optional, run once if needed) ---
// This is an example of how you might seed data.
// You would typically run this from a script or a protected admin function.
// For this app, since Firestore starts empty, the UI will reflect that.
// If you want initial data, you can call this function (e.g. from a useEffect in a top-level component ONCE).
export const seedInitialData = async () => {
  const locationsSnapshot = await getDocs(locationsCollection);
  if (!locationsSnapshot.empty) {
    console.log("Data already exists. Skipping seed.");
    return;
  }

  console.log("Seeding initial data...");
  const batch = writeBatch(db);

  const loc1Data = { name: 'Granada, Spain' };
  const loc1Ref = doc(locationsCollection);
  batch.set(loc1Ref, loc1Data);

  const loc2Data = { name: 'Second Location (Coming Soon)' };
  const loc2Ref = doc(locationsCollection);
  batch.set(loc2Ref, loc2Data);
  
  const initialRoomsData = [
    { name: 'Sunrise Suite', locationId: loc1Ref.id },
    { name: 'Ocean View Deluxe', locationId: loc1Ref.id },
    { name: 'Garden Retreat', locationId: loc1Ref.id },
  ];

  const roomRefs: string[] = [];
  initialRoomsData.forEach(roomData => {
    const roomRef = doc(roomsCollection);
    batch.set(roomRef, roomData);
    roomRefs.push(roomRef.id);
  });

  if (roomRefs.length > 0) {
      const initialBookingsData = [
        { 
          roomId: roomRefs[0], 
          guestName: 'Alice Wonderland', 
          status: 'booked' as const,
          startDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 2))),
          endDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 1))),
        },
        { 
          roomId: roomRefs[1], 
          guestName: 'Bob The Builder', 
          status: 'pending' as const,
          startDate: Timestamp.fromDate(new Date()),
          endDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 3))),
        },
      ];
      initialBookingsData.forEach(bookingData => {
        const bookingRef = doc(bookingsCollection);
        batch.set(bookingRef, bookingData);
      });
  }

  try {
    await batch.commit();
    console.log("Initial data seeded successfully.");
  } catch (error) {
    console.error("Error seeding data: ", error);
  }
};
