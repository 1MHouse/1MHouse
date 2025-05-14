
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
  console.log("[data.ts] Attempting to fetch locations...");
  try {
    const snapshot = await getDocs(locationsCollection);
    const fetchedLocations = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Location));
    console.log(`[data.ts] Fetched ${fetchedLocations.length} locations:`, JSON.stringify(fetchedLocations));
    return fetchedLocations;
  } catch (error) {
    console.error("[data.ts] Error fetching locations: ", error);
    return [];
  }
};

export const addLocation = async (name: string): Promise<Location | undefined> => {
  try {
    const docRef = await addDoc(locationsCollection, { name });
    console.log(`[data.ts] Added location '${name}' with ID: ${docRef.id}`);
    return { id: docRef.id, name };
  } catch (error) {
    console.error("[data.ts] Error adding location: ", error);
    return undefined;
  }
};

export const updateLocation = async (updatedLocation: Location): Promise<Location | undefined> => {
  try {
    const locationDoc = doc(db, 'locations', updatedLocation.id);
    await updateDoc(locationDoc, { name: updatedLocation.name });
    console.log(`[data.ts] Updated location ID '${updatedLocation.id}' to name: ${updatedLocation.name}`);
    return updatedLocation;
  } catch (error) {
    console.error("[data.ts] Error updating location: ", error);
    return undefined;
  }
};

export const deleteLocation = async (locationId: string): Promise<boolean> => {
  try {
    const roomsSnapshot = await getDocs(query(collection(db, 'rooms'), where('locationId', '==', locationId), limit(1)));
    if (!roomsSnapshot.empty) {
      console.warn(`[data.ts] Cannot delete location ${locationId} as it has associated rooms.`);
      return false;
    }
    const locationDoc = doc(db, 'locations', locationId);
    await deleteDoc(locationDoc);
    console.log(`[data.ts] Deleted location ID '${locationId}'`);
    return true;
  } catch (error) {
    console.error("[data.ts] Error deleting location: ", error);
    return false;
  }
};

// --- Room Functions ---
const roomsCollection = collection(db, 'rooms');

export const getRooms = async (locationId?: string): Promise<Room[]> => {
  console.log(`[data.ts] Attempting to fetch rooms ${locationId ? `for location ID: ${locationId}` : '(all locations)'}...`);
  try {
    let q = query(roomsCollection);
    if (locationId) {
      q = query(roomsCollection, where('locationId', '==', locationId));
    }
    const snapshot = await getDocs(q);
    const fetchedRooms = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Room));
    console.log(`[data.ts] Fetched ${fetchedRooms.length} rooms ${locationId ? `for location ID: ${locationId}` : ''}:`, JSON.stringify(fetchedRooms));
    return fetchedRooms;
  } catch (error) {
    console.error("[data.ts] Error fetching rooms: ", error);
    return [];
  }
};

export const addRoom = async (name: string, locationId: string): Promise<Room | undefined> => {
 try {
    const docRef = await addDoc(roomsCollection, { name, locationId });
    console.log(`[data.ts] Added room '${name}' to location ID '${locationId}' with room ID: ${docRef.id}`);
    return { id: docRef.id, name, locationId };
  } catch (error) {
    console.error("[data.ts] Error adding room: ", error);
    return undefined;
  }
};

export const updateRoom = async (updatedRoom: Room): Promise<Room | undefined> => {
  try {
    const roomDoc = doc(db, 'rooms', updatedRoom.id);
    await updateDoc(roomDoc, { name: updatedRoom.name, locationId: updatedRoom.locationId });
    console.log(`[data.ts] Updated room ID '${updatedRoom.id}' to name: ${updatedRoom.name}, locationId: ${updatedRoom.locationId}`);
    return updatedRoom;
  } catch (error) {
    console.error("[data.ts] Error updating room: ", error);
    return undefined;
  }
};

export const deleteRoom = async (roomId: string): Promise<boolean> => {
  try {
    const bookingsSnapshot = await getDocs(query(collection(db, 'bookings'), where('roomId', '==', roomId), limit(1)));
    if (!bookingsSnapshot.empty) {
      console.warn(`[data.ts] Cannot delete room ${roomId} as it has associated bookings.`);
      return false;
    }
    const roomDoc = doc(db, 'rooms', roomId);
    await deleteDoc(roomDoc);
    console.log(`[data.ts] Deleted room ID '${roomId}'`);
    return true;
  } catch (error) {
    console.error("[data.ts] Error deleting room: ", error);
    return false;
  }
};

// --- Booking Functions ---
const bookingsCollection = collection(db, 'bookings');

export const getBookings = async (roomId?: string): Promise<Booking[]> => {
  console.log(`[data.ts] Attempting to fetch bookings ${roomId ? `for room ID: ${roomId}` : '(all rooms)'}...`);
  try {
    let q = query(bookingsCollection);
    if (roomId) {
      q = query(bookingsCollection, where('roomId', '==', roomId));
    }
    const snapshot = await getDocs(q);
    const fetchedBookings = snapshot.docs.map(docSnap => bookingFromDoc(docSnap.id, docSnap.data() as BookingDocument));
    console.log(`[data.ts] Fetched ${fetchedBookings.length} bookings ${roomId ? `for room ID: ${roomId}` : ''}.`);
    return fetchedBookings;
  } catch (error) {
    console.error("[data.ts] Error fetching bookings: ", error);
    return [];
  }
};

export const getBookingsByLocation = async (locationId: string): Promise<Booking[]> => {
  console.log(`[data.ts] Attempting to fetch bookings for location ID: ${locationId}...`);
  try {
    const locationRooms = await getRooms(locationId);
    if (locationRooms.length === 0) {
        console.log(`[data.ts] No rooms found for location ${locationId}, returning empty bookings array.`);
        return [];
    }

    const roomIds = locationRooms.map(room => room.id);
    
    if (roomIds.length === 0) {
        console.log(`[data.ts] Room IDs array is empty for location ${locationId}, returning empty bookings array.`);
        return [];
    }
    console.log(`[data.ts] Fetching bookings for room IDs: ${roomIds.join(', ')} in location ${locationId}`);

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
    const flatResults = results.flat();
    console.log(`[data.ts] Fetched ${flatResults.length} bookings for location ID ${locationId}.`);
    return flatResults;

  } catch (error) {
    console.error("[data.ts] Error fetching bookings by location:", error);
    return [];
  }
};


export const addBooking = async (bookingData: Omit<Booking, 'id'>): Promise<Booking | undefined> => {
  try {
    const docData = bookingToDocData(bookingData);
    const docRef = await addDoc(bookingsCollection, docData);
    console.log(`[data.ts] Added booking for guest '${bookingData.guestName}' with ID: ${docRef.id}`);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
        return bookingFromDoc(newDocSnap.id, newDocSnap.data() as BookingDocument);
    }
    return undefined; 
  } catch (error) {
    console.error("[data.ts] Error adding booking: ", error);
    return undefined;
  }
};

export const updateBooking = async (bookingData: Booking): Promise<Booking | undefined> => {
  try {
    const bookingDoc = doc(db, 'bookings', bookingData.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...docDataContent } = bookingData; 
    const firestoreDocData = bookingToDocData(docDataContent);
    await updateDoc(bookingDoc, firestoreDocData as any); 
    console.log(`[data.ts] Updated booking ID '${bookingData.id}' for guest: ${bookingData.guestName}`);
    const updatedDocSnap = await getDoc(bookingDoc);
     if (updatedDocSnap.exists()) {
        return bookingFromDoc(updatedDocSnap.id, updatedDocSnap.data() as BookingDocument);
    }
    return bookingData; 
  } catch (error) {
    console.error("[data.ts] Error updating booking: ", error);
    return undefined;
  }
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  try {
    const bookingDoc = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingDoc);
    console.log(`[data.ts] Deleted booking ID '${bookingId}'`);
    return true;
  } catch (error) {
    console.error("[data.ts] Error deleting booking: ", error);
    return false;
  }
};

// --- Initial Data Seeding ---
export const seedInitialData = async () => {
  console.log("[data.ts] seedInitialData: Checking if initial data seeding is required for Firestore...");
  const locationsQuery = query(locationsCollection, limit(1));
  
  try {
    const locationsSnapshot = await getDocs(locationsQuery);
    if (!locationsSnapshot.empty) {
      console.log("[data.ts] seedInitialData: Data already exists in Firestore (found locations). Skipping seed. Locations found:", locationsSnapshot.docs.map(d => d.data()));
      return;
    }
  } catch (e) {
    console.error("[data.ts] seedInitialData: Error checking for existing locations. Firestore might not be configured correctly or rules are too restrictive.", e);
    return; // Stop if we can't even check
  }


  console.log("[data.ts] seedInitialData: No existing locations found. Proceeding with seeding initial data into Firestore...");
  const batch = writeBatch(db);

  // Location 1: Granada, Spain
  const loc1Data = { name: 'Granada, Spain' };
  const loc1Ref = doc(locationsCollection); 
  batch.set(loc1Ref, loc1Data);
  console.log(`[data.ts] seedInitialData: Prepared to seed Location 1: ${loc1Data.name} (ID: ${loc1Ref.id})`);


  // Location 2: Second Location (Coming Soon)
  const loc2Data = { name: 'Second Location (Coming Soon)' };
  const loc2Ref = doc(locationsCollection); 
  batch.set(loc2Ref, loc2Data);
  console.log(`[data.ts] seedInitialData: Prepared to seed Location 2: ${loc2Data.name} (ID: ${loc2Ref.id})`);

  
  // Rooms for Location 1 (Granada)
  const granadaRoomsData = [
    { name: 'Sunrise Suite', locationId: loc1Ref.id },
    { name: 'Ocean View Deluxe', locationId: loc1Ref.id },
    { name: 'Garden Retreat', locationId: loc1Ref.id },
  ];

  const granadaRoomDocIds: string[] = [];
  granadaRoomsData.forEach(roomData => {
    const roomDocRef = doc(roomsCollection); 
    batch.set(roomDocRef, roomData);
    granadaRoomDocIds.push(roomDocRef.id);
    console.log(`[data.ts] seedInitialData: Prepared to seed Room: ${roomData.name} (ID: ${roomDocRef.id}) for Location 1`);
  });

  // Bookings for rooms in Location 1 (Granada)
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
        const bookingDocRef = doc(bookingsCollection); 
        batch.set(bookingDocRef, bookingData);
        console.log(`[data.ts] seedInitialData: Prepared to seed Booking for Guest: ${bookingData.guestName} in Room ID: ${bookingData.roomId}`);
      });
  } else {
      console.warn("[data.ts] seedInitialData: Not enough rooms created for Granada to seed bookings.");
  }

  try {
    await batch.commit();
    console.log("[data.ts] seedInitialData: Initial data batch committed successfully to Firestore.");
  } catch (error) {
    console.error("[data.ts] seedInitialData: Error committing batch to Firestore: ", error);
  }
};

    