
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  writeBatch,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import type { Location, Room, Booking, BookingDocument } from './types';

// --- Helper Functions ---
const convertTimestampToDate = (data: any): any => {
  if (data && data.startDate && data.startDate instanceof Timestamp) {
    data.startDate = data.startDate.toDate();
  }
  if (data && data.endDate && data.endDate instanceof Timestamp) {
    data.endDate = data.endDate.toDate();
  }
  return data;
};

// --- Location Functions ---
export const getLocations = async (): Promise<Location[]> => {
  if (!db) {
    console.error("[data.ts] getLocations: Firestore not initialized. Returning empty array.");
    return [];
  }
  console.log("[data.ts] getLocations: Fetching locations from Firestore...");
  try {
    const locationsCol = collection(db, 'locations');
    const locationSnapshot = await getDocs(locationsCol);
    const locationsList = locationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
    console.log(`[data.ts] getLocations: Fetched ${locationsList.length} locations.`);
    return locationsList;
  } catch (error) {
    console.error("[data.ts] getLocations: Error fetching locations:", error);
    return [];
  }
};

export const addLocation = async (name: string): Promise<Location | null> => {
  if (!db) {
    console.error("[data.ts] addLocation: Firestore not initialized.");
    return null;
  }
  console.log(`[data.ts] addLocation: Adding location "${name}" to Firestore...`);
  try {
    const docRef = await addDoc(collection(db, 'locations'), { name });
    console.log(`[data.ts] addLocation: Location added with ID: ${docRef.id}`);
    return { id: docRef.id, name };
  } catch (error) {
    console.error("[data.ts] addLocation: Error adding location:", error);
    return null;
  }
};

export const updateLocation = async (updatedLocation: Location): Promise<boolean> => {
  if (!db) {
    console.error("[data.ts] updateLocation: Firestore not initialized.");
    return false;
  }
  console.log(`[data.ts] updateLocation: Updating location ID ${updatedLocation.id} in Firestore...`);
  try {
    const locationDoc = doc(db, 'locations', updatedLocation.id);
    await updateDoc(locationDoc, { name: updatedLocation.name });
    console.log(`[data.ts] updateLocation: Location ${updatedLocation.id} updated.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] updateLocation: Error updating location ${updatedLocation.id}:`, error);
    return false;
  }
};

export const deleteLocation = async (locationId: string): Promise<boolean> => {
  if (!db) {
    console.error("[data.ts] deleteLocation: Firestore not initialized.");
    return false;
  }
  console.log(`[data.ts] deleteLocation: Deleting location ID ${locationId} from Firestore...`);
  try {
    // Check for associated rooms first
    const roomsQuery = query(collection(db, 'rooms'), where('locationId', '==', locationId));
    const roomSnapshot = await getDocs(roomsQuery);
    if (!roomSnapshot.empty) {
      console.warn(`[data.ts] deleteLocation: Cannot delete location ${locationId}, it has ${roomSnapshot.size} associated rooms.`);
      return false; 
    }
    await deleteDoc(doc(db, 'locations', locationId));
    console.log(`[data.ts] deleteLocation: Location ${locationId} deleted.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] deleteLocation: Error deleting location ${locationId}:`, error);
    return false;
  }
};

// --- Room Functions ---
export const getRooms = async (locationId?: string): Promise<Room[]> => {
  if (!db) {
    console.error("[data.ts] getRooms: Firestore not initialized. Returning empty array.");
    return [];
  }
  console.log(`[data.ts] getRooms: Fetching rooms ${locationId ? `for location ${locationId}` : '(all rooms)'} from Firestore...`);
  try {
    let roomsQuery;
    if (locationId) {
      roomsQuery = query(collection(db, 'rooms'), where('locationId', '==', locationId));
    } else {
      roomsQuery = collection(db, 'rooms');
    }
    const roomSnapshot = await getDocs(roomsQuery);
    const roomList = roomSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
    console.log(`[data.ts] getRooms: Fetched ${roomList.length} rooms.`);
    return roomList;
  } catch (error) {
    console.error("[data.ts] getRooms: Error fetching rooms:", error);
    return [];
  }
};

export const addRoom = async (name: string, locationId: string): Promise<Room | null> => {
   if (!db) {
    console.error("[data.ts] addRoom: Firestore not initialized.");
    return null;
  }
  console.log(`[data.ts] addRoom: Adding room "${name}" for location ${locationId} to Firestore...`);
  try {
    const docRef = await addDoc(collection(db, 'rooms'), { name, locationId });
    console.log(`[data.ts] addRoom: Room added with ID: ${docRef.id}`);
    return { id: docRef.id, name, locationId };
  } catch (error) {
    console.error("[data.ts] addRoom: Error adding room:", error);
    return null;
  }
};

export const updateRoom = async (updatedRoom: Room): Promise<boolean> => {
  if (!db) {
    console.error("[data.ts] updateRoom: Firestore not initialized.");
    return false;
  }
  console.log(`[data.ts] updateRoom: Updating room ID ${updatedRoom.id} in Firestore...`);
  try {
    const roomDoc = doc(db, 'rooms', updatedRoom.id);
    await updateDoc(roomDoc, { name: updatedRoom.name, locationId: updatedRoom.locationId });
    console.log(`[data.ts] updateRoom: Room ${updatedRoom.id} updated.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] updateRoom: Error updating room ${updatedRoom.id}:`, error);
    return false;
  }
};

export const deleteRoom = async (roomId: string): Promise<boolean> => {
  if (!db) {
    console.error("[data.ts] deleteRoom: Firestore not initialized.");
    return false;
  }
  console.log(`[data.ts] deleteRoom: Deleting room ID ${roomId} from Firestore...`);
  try {
    // Check for associated bookings first
    const bookingsQuery = query(collection(db, 'bookings'), where('roomId', '==', roomId));
    const bookingSnapshot = await getDocs(bookingsQuery);
    if (!bookingSnapshot.empty) {
      console.warn(`[data.ts] deleteRoom: Cannot delete room ${roomId}, it has ${bookingSnapshot.size} associated bookings.`);
      return false;
    }
    await deleteDoc(doc(db, 'rooms', roomId));
    console.log(`[data.ts] deleteRoom: Room ${roomId} deleted.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] deleteRoom: Error deleting room ${roomId}:`, error);
    return false;
  }
};

// --- Booking Functions ---
export const getBookings = async (roomIdOrLocationId?: string, type: 'room' | 'location' = 'room'): Promise<Booking[]> => {
  if (!db) {
    console.error("[data.ts] getBookings: Firestore not initialized. Returning empty array.");
    return [];
  }
  
  if (type === 'location' && roomIdOrLocationId) {
    console.log(`[data.ts] getBookings (by location): Fetching bookings for location ${roomIdOrLocationId} from Firestore...`);
    return getBookingsByLocation(roomIdOrLocationId);
  } else if (type === 'room' && roomIdOrLocationId) {
    console.log(`[data.ts] getBookings (by room): Fetching bookings for room ${roomIdOrLocationId} from Firestore...`);
    return getBookingsByRoomId(roomIdOrLocationId);
  } else {
    console.log(`[data.ts] getBookings (all): Fetching all bookings from Firestore...`);
    try {
      const bookingsQuery = collection(db, 'bookings');
      const bookingSnapshot: QuerySnapshot<DocumentData> = await getDocs(bookingsQuery);
      const bookingList = bookingSnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampToDate({ id: doc.id, ...data }) as Booking;
      });
      console.log(`[data.ts] getBookings (all): Fetched ${bookingList.length} bookings.`);
      return bookingList;
    } catch (error) {
      console.error("[data.ts] getBookings (all): Error fetching all bookings:", error);
      return [];
    }
  }
};


export const getBookingsByRoomId = async (roomId: string): Promise<Booking[]> => {
  if (!db) {
    console.error("[data.ts] getBookingsByRoomId: Firestore not initialized. Returning empty array.");
    return [];
  }
  console.log(`[data.ts] getBookingsByRoomId: Fetching bookings for room ${roomId} from Firestore...`);
  try {
    const bookingsQuery = query(collection(db, 'bookings'), where('roomId', '==', roomId));
    const bookingSnapshot: QuerySnapshot<DocumentData> = await getDocs(bookingsQuery);
    const bookingList = bookingSnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestampToDate({ id: doc.id, ...data }) as Booking;
    });
    console.log(`[data.ts] getBookingsByRoomId: Fetched ${bookingList.length} bookings for room ${roomId}.`);
    return bookingList;
  } catch (error) {
    console.error(`[data.ts] getBookingsByRoomId: Error fetching bookings for room ${roomId}:`, error);
    return [];
  }
};

export const getBookingsByLocation = async (locationId: string): Promise<Booking[]> => {
  if (!db) {
    console.error("[data.ts] getBookingsByLocation: Firestore not initialized. Returning empty array.");
    return [];
  }
  console.log(`[data.ts] getBookingsByLocation: Fetching bookings for location ${locationId} from Firestore...`);
  try {
    const locationRooms = await getRooms(locationId);
    if (locationRooms.length === 0) {
      console.log(`[data.ts] getBookingsByLocation: No rooms found for location ${locationId}. Returning empty bookings array.`);
      return [];
    }
    const roomIds = locationRooms.map(room => room.id);
    
    if (roomIds.length === 0) { // Should be caught by previous check, but good for safety
        console.log(`[data.ts] getBookingsByLocation: No room IDs to query for location ${locationId}.`);
        return [];
    }
    
    // Firestore 'in' query supports up to 30 elements in the array.
    // For more than 30 rooms, multiple queries would be needed. This example assumes fewer.
    if (roomIds.length > 30) {
        console.warn("[data.ts] getBookingsByLocation: Location has more than 30 rooms. Querying for first 30 rooms only due to Firestore limitations.");
        // Potentially implement multiple queries and merge results for > 30 rooms.
    }
    
    const bookingsQuery = query(collection(db, 'bookings'), where('roomId', 'in', roomIds.slice(0,30)));
    const bookingSnapshot = await getDocs(bookingsQuery);
    const bookingList = bookingSnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestampToDate({ id: doc.id, ...data }) as Booking;
    });
    console.log(`[data.ts] getBookingsByLocation: Fetched ${bookingList.length} bookings for location ${locationId}.`);
    return bookingList;
  } catch (error) {
    console.error(`[data.ts] getBookingsByLocation: Error fetching bookings for location ${locationId}:`, error);
    return [];
  }
};

export const addBooking = async (bookingData: Omit<Booking, 'id'>): Promise<Booking | null> => {
  if (!db) {
    console.error("[data.ts] addBooking: Firestore not initialized.");
    return null;
  }
  console.log(`[data.ts] addBooking: Adding booking to Firestore...`, bookingData);
  try {
    const bookingDoc: BookingDocument = {
      ...bookingData,
      startDate: Timestamp.fromDate(new Date(bookingData.startDate as Date)),
      endDate: Timestamp.fromDate(new Date(bookingData.endDate as Date)),
    };
    const docRef = await addDoc(collection(db, 'bookings'), bookingDoc);
    console.log(`[data.ts] addBooking: Booking added with ID: ${docRef.id}`);
    // Convert Timestamps back to Dates for the returned object to match Booking type
    const newBooking: Booking = { 
      ...bookingData, 
      id: docRef.id,
      startDate: (bookingDoc.startDate as Timestamp).toDate(),
      endDate: (bookingDoc.endDate as Timestamp).toDate()
    };
    return newBooking;
  } catch (error) {
    console.error("[data.ts] addBooking: Error adding booking:", error);
    return null;
  }
};

export const updateBooking = async (updatedBooking: Booking): Promise<boolean> => {
  if (!db) {
    console.error("[data.ts] updateBooking: Firestore not initialized.");
    return false;
  }
  console.log(`[data.ts] updateBooking: Updating booking ID ${updatedBooking.id} in Firestore...`);
  try {
    const bookingDocRef = doc(db, 'bookings', updatedBooking.id);
    const { id, ...bookingData } = updatedBooking; // Exclude id from data to be written
    
    // Ensure dates are Timestamps before writing to Firestore
    const startDate = bookingData.startDate instanceof Date ? Timestamp.fromDate(bookingData.startDate) : bookingData.startDate;
    const endDate = bookingData.endDate instanceof Date ? Timestamp.fromDate(bookingData.endDate) : bookingData.endDate;

    const bookingDocData: Partial<BookingDocument> = { // Use Partial for update
        ...(bookingData as Omit<Booking, 'id' | 'startDate' | 'endDate'>), 
        startDate: startDate as Timestamp, // Cast as Timestamp
        endDate: endDate as Timestamp,     // Cast as Timestamp
    };

    await updateDoc(bookingDocRef, bookingDocData); 
    console.log(`[data.ts] updateBooking: Booking ${updatedBooking.id} updated.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] updateBooking: Error updating booking ${updatedBooking.id}:`, error);
    return false;
  }
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  if (!db) {
    console.error("[data.ts] deleteBooking: Firestore not initialized.");
    return false;
  }
  console.log(`[data.ts] deleteBooking: Deleting booking ID ${bookingId} from Firestore...`);
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
    console.log(`[data.ts] deleteBooking: Booking ${bookingId} deleted.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] deleteBooking: Error deleting booking ${bookingId}:`, error);
    return false;
  }
};

// --- Seeding Initial Data ---
export const seedInitialData = async () => {
  if (!db) {
    console.error("[data.ts] seedInitialData: Firestore not initialized. Cannot seed.");
    return;
  }
  console.log("[data.ts] seedInitialData: Checking if initial data seeding is required for Firestore...");

  try {
    const locationsCol = collection(db, 'locations');
    let locationSnapshot = await getDocs(query(locationsCol)); 
    
    if (locationSnapshot.empty) {
      console.log("[data.ts] seedInitialData: No locations found. Seeding initial data into Firestore...");
      const batch = writeBatch(db);

      const initialLocationsData: Omit<Location, 'id'>[] = [
        { name: 'Granada, Spain' },
        { name: 'Second Location (Coming Soon)' },
      ];
      
      const locationRefs: { [key: string]: string } = {};
      const createdLocationIds: string[] = [];

      for (const locData of initialLocationsData) {
        const locRef = doc(collection(db, 'locations')); // Auto-generate ID
        batch.set(locRef, locData);
        createdLocationIds.push(locRef.id); // Store the auto-generated ID
        if (locData.name === 'Granada, Spain') locationRefs.granada = locRef.id;
      }
      console.log("[data.ts] seedInitialData: Locations prepared for batch.");

      if (locationRefs.granada) {
        const initialRoomsData: Omit<Room, 'id'>[] = [
          { name: 'Sunrise Suite', locationId: locationRefs.granada },
          { name: 'Ocean View Deluxe', locationId: locationRefs.granada },
          { name: 'Garden Retreat', locationId: locationRefs.granada },
        ];
        const roomRefs: { [key: string]: string } = {};

        for (const roomData of initialRoomsData) {
          const roomRef = doc(collection(db, 'rooms')); // Auto-generate ID
          batch.set(roomRef, roomData);
          if (roomData.name === 'Sunrise Suite') roomRefs.sunrise = roomRef.id;
          if (roomData.name === 'Ocean View Deluxe') roomRefs.ocean = roomRef.id;
        }
        console.log("[data.ts] seedInitialData: Rooms prepared for batch.");

        if (roomRefs.sunrise && roomRefs.ocean) {
            const initialBookingsData: Omit<Booking, 'id'>[] = [
            {
                roomId: roomRefs.sunrise,
                guestName: 'Alice Wonderland',
                startDate: new Date(new Date().setDate(new Date().getDate() - 2)),
                endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
                status: 'booked',
            },
            {
                roomId: roomRefs.ocean,
                guestName: 'Bob The Builder',
                startDate: new Date(),
                endDate: new Date(new Date().setDate(new Date().getDate() + 3)),
                status: 'pending',
            },
            ];
            for (const bookingData of initialBookingsData) {
                const bookingDoc: BookingDocument = {
                    ...bookingData,
                    startDate: Timestamp.fromDate(new Date(bookingData.startDate as Date)),
                    endDate: Timestamp.fromDate(new Date(bookingData.endDate as Date)),
                };
                const bookingRef = doc(collection(db, 'bookings')); // Auto-generate ID
                batch.set(bookingRef, bookingDoc);
            }
            console.log("[data.ts] seedInitialData: Bookings prepared for batch.");
        }
      }
      await batch.commit();
      console.log("[data.ts] seedInitialData: Initial data batch committed successfully to Firestore.");
      // Re-fetch location snapshot to confirm
      locationSnapshot = await getDocs(query(locationsCol));
      console.log(`[data.ts] seedInitialData: Confirmed locations after seed: ${locationSnapshot.size} docs.`);
    } else {
      console.log(`[data.ts] seedInitialData: Locations collection is not empty (${locationSnapshot.size} docs found). Skipping seed.`);
    }
  } catch (error) {
    console.error("[data.ts] seedInitialData: Error during seeding process:", error);
  }
};
