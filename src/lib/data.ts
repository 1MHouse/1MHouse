
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
  limit, // For checking if collection is empty efficiently
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
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Location));
  } catch (error) {
    console.error("Error fetching locations: ", error);
    return [];
  }
};

export const addLocation = async (name: string): Promise<Location | undefined> => {
  try {
    const docRef = await addDoc(locationsCollection, { name });
    return { id: docRef.id, name };
  } catch (error) {
    console.error("Error adding location: ", error);
    return undefined;
  }
};

export const updateLocation = async (updatedLocation: Location): Promise<Location | undefined> => {
  try {
    const locationDoc = doc(db, 'locations', updatedLocation.id);
    await updateDoc(locationDoc, { name: updatedLocation.name });
    return updatedLocation;
  } catch (error) {
    console.error("Error updating location: ", error);
    return undefined;
  }
};

export const deleteLocation = async (locationId: string): Promise<boolean> => {
  try {
    const roomsSnapshot = await getDocs(query(roomsCollection, where('locationId', '==', locationId), limit(1)));
    if (!roomsSnapshot.empty) {
      console.warn(`Cannot delete location ${locationId} as it has associated rooms.`);
      return false;
    }
    const locationDoc = doc(db, 'locations', locationId);
    await deleteDoc(locationDoc);
    return true;
  } catch (error) {
    console.error("Error deleting location: ", error);
    return false;
  }
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
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Room));
  } catch (error) {
    console.error("Error fetching rooms: ", error);
    return [];
  }
};

export const addRoom = async (name: string, locationId: string): Promise<Room | undefined> => {
 try {
    const docRef = await addDoc(roomsCollection, { name, locationId });
    return { id: docRef.id, name, locationId };
  } catch (error) {
    console.error("Error adding room: ", error);
    return undefined;
  }
};

export const updateRoom = async (updatedRoom: Room): Promise<Room | undefined> => {
  try {
    const roomDoc = doc(db, 'rooms', updatedRoom.id);
    await updateDoc(roomDoc, { name: updatedRoom.name, locationId: updatedRoom.locationId });
    return updatedRoom;
  } catch (error) {
    console.error("Error updating room: ", error);
    return undefined;
  }
};

export const deleteRoom = async (roomId: string): Promise<boolean> => {
  try {
    const bookingsSnapshot = await getDocs(query(bookingsCollection, where('roomId', '==', roomId), limit(1)));
    if (!bookingsSnapshot.empty) {
      console.warn(`Cannot delete room ${roomId} as it has associated bookings.`);
      return false;
    }
    const roomDoc = doc(db, 'rooms', roomId);
    await deleteDoc(roomDoc);
    return true;
  } catch (error) {
    console.error("Error deleting room: ", error);
    return false;
  }
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
    return snapshot.docs.map(docSnap => bookingFromDoc(docSnap.id, docSnap.data() as BookingDocument));
  } catch (error) {
    console.error("Error fetching bookings: ", error);
    return [];
  }
};

export const getBookingsByLocation = async (locationId: string): Promise<Booking[]> => {
  try {
    const locationRooms = await getRooms(locationId);
    if (locationRooms.length === 0) return [];

    const roomIds = locationRooms.map(room => room.id);
    
    if (roomIds.length === 0) return [];

    // Firestore 'in' query supports up to 30 elements in the array. Chunk if necessary.
    const bookingPromises: Promise<Booking[]>[] = [];
    for (let i = 0; i < roomIds.length; i += 30) {
        const chunk = roomIds.slice(i, i + 30);
        if (chunk.length > 0) {
            const q = query(bookingsCollection, where('roomId', 'in', chunk));
            bookingPromises.push(getDocs(q).then(snapshot => 
                snapshot.docs.map(docSnapshot => bookingFromDoc(docSnapshot.id, docSnapshot.data() as BookingDocument))
            ));
        }
    }
    const results = await Promise.all(bookingPromises);
    return results.flat();

  } catch (error) {
    console.error("Error fetching bookings by location:", error);
    return [];
  }
};


export const addBooking = async (bookingData: Omit<Booking, 'id'>): Promise<Booking | undefined> => {
  try {
    const docData = bookingToDocData(bookingData);
    const docRef = await addDoc(bookingsCollection, docData);
    // Fetch the document to get Timestamps converted to Dates through bookingFromDoc
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
        return bookingFromDoc(newDocSnap.id, newDocSnap.data() as BookingDocument);
    }
    return undefined; // Should ideally not happen
  } catch (error) {
    console.error("Error adding booking: ", error);
    return undefined;
  }
};

export const updateBooking = async (bookingData: Booking): Promise<Booking | undefined> => {
  try {
    const bookingDoc = doc(db, 'bookings', bookingData.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...docDataContent } = bookingData; 
    const firestoreDocData = bookingToDocData(docDataContent);
    await updateDoc(bookingDoc, firestoreDocData as any); // Use 'any' to bypass strict type checking for update
    // Fetch the document to get Timestamps converted to Dates through bookingFromDoc
    const updatedDocSnap = await getDoc(bookingDoc);
     if (updatedDocSnap.exists()) {
        return bookingFromDoc(updatedDocSnap.id, updatedDocSnap.data() as BookingDocument);
    }
    return bookingData; // Fallback, though updated data should be fetched
  } catch (error) {
    console.error("Error updating booking: ", error);
    return undefined;
  }
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  try {
    const bookingDoc = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingDoc);
    return true;
  } catch (error) {
    console.error("Error deleting booking: ", error);
    return false;
  }
};

// --- Initial Data Seeding ---
export const seedInitialData = async () => {
  const locationsQuery = query(locationsCollection, limit(1));
  const locationsSnapshot = await getDocs(locationsQuery);
  if (!locationsSnapshot.empty) {
    console.log("Data already exists in Firestore (found locations). Skipping seed.");
    return;
  }

  console.log("Seeding initial data into Firestore...");
  const batch = writeBatch(db);

  // Location 1: Granada, Spain
  const loc1Data = { name: 'Granada, Spain' };
  const loc1Ref = doc(locationsCollection); // Auto-generate ID for location 1
  batch.set(loc1Ref, loc1Data);

  // Location 2: Second Location (Coming Soon)
  const loc2Data = { name: 'Second Location (Coming Soon)' };
  const loc2Ref = doc(locationsCollection); // Auto-generate ID for location 2
  batch.set(loc2Ref, loc2Data);
  
  // Rooms for Location 1 (Granada)
  const granadaRoomsData = [
    { name: 'Sunrise Suite', locationId: loc1Ref.id },
    { name: 'Ocean View Deluxe', locationId: loc1Ref.id },
    { name: 'Garden Retreat', locationId: loc1Ref.id },
  ];

  const granadaRoomDocIds: string[] = [];
  granadaRoomsData.forEach(roomData => {
    const roomDocRef = doc(roomsCollection); // Auto-generate ID for room
    batch.set(roomDocRef, roomData);
    granadaRoomDocIds.push(roomDocRef.id);
  });

  // Bookings for rooms in Location 1 (Granada)
  // Ensure we have at least two rooms in Granada to seed bookings for them
  if (granadaRoomDocIds.length >= 2) { 
      const initialBookingsData = [
        { 
          roomId: granadaRoomDocIds[0], 
          guestName: 'Alice Wonderland', 
          status: 'booked' as const,
          startDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 2))),
          endDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 1))),
        },
        { 
          roomId: granadaRoomDocIds[1], 
          guestName: 'Bob The Builder', 
          status: 'pending' as const,
          startDate: Timestamp.fromDate(new Date()),
          endDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 3))),
        },
      ];
      initialBookingsData.forEach(bookingData => {
        const bookingDocRef = doc(bookingsCollection); // Auto-generate ID for booking
        batch.set(bookingDocRef, bookingData);
      });
  }

  try {
    await batch.commit();
    console.log("Initial data seeded successfully into Firestore.");
  } catch (error) {
    console.error("Error seeding data into Firestore: ", error);
  }
};
