
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
  if (data && typeof data === 'object') {
    if (data.startDate && data.startDate instanceof Timestamp) {
      data.startDate = data.startDate.toDate();
    }
    if (data.endDate && data.endDate instanceof Timestamp) {
      data.endDate = data.endDate.toDate();
    }
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
    
    // Sort locations alphabetically by name
    locationsList.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`[data.ts] getLocations: Fetched and sorted ${locationsList.length} locations.`);
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
    // Check for associated rooms
    const roomsQuery = query(collection(db, 'rooms'), where('locationId', '==', locationId));
    const roomSnapshot = await getDocs(roomsQuery);
    if (!roomSnapshot.empty) {
      console.warn(`[data.ts] deleteLocation: Cannot delete location ${locationId}, it has ${roomSnapshot.size} associated room(s). Please delete rooms first.`);
      return false; 
    }

    // If no rooms, proceed to delete location
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
  const logContext = locationId ? `for location ${locationId}` : '(all rooms)';
  console.log(`[data.ts] getRooms: Fetching rooms ${logContext} from Firestore...`);
  try {
    let roomsQuery;
    if (locationId) {
      roomsQuery = query(collection(db, 'rooms'), where('locationId', '==', locationId));
    } else {
      roomsQuery = collection(db, 'rooms');
    }
    const roomSnapshot = await getDocs(roomsQuery);
    const roomList = roomSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Room));
    console.log(`[data.ts] getRooms: Fetched ${roomList.length} rooms ${logContext}.`);
    return roomList;
  } catch (error) {
    console.error(`[data.ts] getRooms: Error fetching rooms ${logContext}:`, error);
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
    // Check for associated bookings
    const bookingsQuery = query(collection(db, 'bookings'), where('roomId', '==', roomId));
    const bookingSnapshot = await getDocs(bookingsQuery);
    if (!bookingSnapshot.empty) {
      console.warn(`[data.ts] deleteRoom: Cannot delete room ${roomId}, it has ${bookingSnapshot.size} associated booking(s). Please delete bookings first.`);
      return false;
    }
    // If no bookings, proceed to delete room
    await deleteDoc(doc(db, 'rooms', roomId));
    console.log(`[data.ts] deleteRoom: Room ${roomId} deleted.`);
    return true;
  } catch (error) {
    console.error(`[data.ts] deleteRoom: Error deleting room ${roomId}:`, error);
    return false;
  }
};

// --- Booking Functions ---
export const getBookings = async (roomId?: string): Promise<Booking[]> => {
  if (!db) {
    console.error("[data.ts] getBookings: Firestore not initialized. Returning empty array.");
    return [];
  }
  
  let bookingsQuery;
  if (roomId) {
    console.log(`[data.ts] getBookings (by room): Fetching bookings for room ${roomId} from Firestore...`);
    bookingsQuery = query(collection(db, 'bookings'), where('roomId', '==', roomId));
  } else {
    console.log(`[data.ts] getBookings (all): Fetching all bookings from Firestore...`);
    bookingsQuery = collection(db, 'bookings');
  }

  try {
    const bookingSnapshot: QuerySnapshot<DocumentData> = await getDocs(bookingsQuery);
    const bookingList = bookingSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return convertTimestampToDate({ id: docSnap.id, ...data }) as Booking;
    });
    console.log(`[data.ts] getBookings: Fetched ${bookingList.length} bookings ${roomId ? `for room ${roomId}` : '(all)'}.`);
    return bookingList;
  } catch (error) {
    console.error(`[data.ts] getBookings: Error fetching bookings ${roomId ? `for room ${roomId}` : '(all)'}:`, error);
    return [];
  }
};

export const getBookingsByRoomId = async (roomId: string): Promise<Booking[]> => {
  return getBookings(roomId); // Re-use general getBookings with roomId filter
};


export const getBookingsByLocation = async (locationId: string): Promise<Booking[]> => {
  if (!db) {
    console.error("[data.ts] getBookingsByLocation: Firestore not initialized for location query. Returning empty array.");
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
    
    if (roomIds.length === 0) { 
        console.log(`[data.ts] getBookingsByLocation: No room IDs to query for location ${locationId}.`);
        return [];
    }
    
    // Firestore 'in' query supports up to 30 elements in the array.
    if (roomIds.length > 30) {
        console.warn("[data.ts] getBookingsByLocation: Location has more than 30 rooms. Querying for first 30 rooms only due to Firestore limitations.");
    }
    
    const bookingsQuery = query(collection(db, 'bookings'), where('roomId', 'in', roomIds.slice(0,30)));
    const bookingSnapshot = await getDocs(bookingsQuery);
    const bookingList = bookingSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return convertTimestampToDate({ id: docSnap.id, ...data }) as Booking;
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
    const startDate = bookingData.startDate instanceof Timestamp ? bookingData.startDate.toDate() : new Date(bookingData.startDate as Date);
    const endDate = bookingData.endDate instanceof Timestamp ? bookingData.endDate.toDate() : new Date(bookingData.endDate as Date);

    const bookingDoc: BookingDocument = {
      roomId: bookingData.roomId,
      guestName: bookingData.guestName,
      status: bookingData.status,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
    };
    const docRef = await addDoc(collection(db, 'bookings'), bookingDoc);
    console.log(`[data.ts] addBooking: Booking added with ID: ${docRef.id}`);
    
    const newBooking: Booking = { 
      ...bookingData, 
      id: docRef.id,
      startDate: startDate, 
      endDate: endDate      
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
    const { id, ...bookingData } = updatedBooking; 
    
    const startDate = bookingData.startDate instanceof Timestamp ? bookingData.startDate.toDate() : new Date(bookingData.startDate as Date);
    const endDate = bookingData.endDate instanceof Timestamp ? bookingData.endDate.toDate() : new Date(bookingData.endDate as Date);

    const bookingDocData: Partial<BookingDocument> = { 
        roomId: bookingData.roomId,
        guestName: bookingData.guestName,
        status: bookingData.status,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
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
    const locationSnapshot = await getDocs(query(locationsCol));
    
    if (locationSnapshot.empty) {
      console.log("[data.ts] seedInitialData: No locations found. Seeding initial data into Firestore...");
      const batch = writeBatch(db);

      const initialLocationsData: Omit<Location, 'id'>[] = [
        { name: 'Granada, Spain' },
        { name: 'Second Location (Coming Soon)' },
      ];
      
      const locationRefs: { [key: string]: string } = {}; 

      for (const locData of initialLocationsData) {
        const locRef = doc(collection(db, 'locations')); 
        batch.set(locRef, locData);
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
          const roomRef = doc(collection(db, 'rooms')); 
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
                    roomId: bookingData.roomId,
                    guestName: bookingData.guestName,
                    status: bookingData.status,
                    startDate: Timestamp.fromDate(new Date(bookingData.startDate as Date)),
                    endDate: Timestamp.fromDate(new Date(bookingData.endDate as Date)),
                };
                const bookingRef = doc(collection(db, 'bookings')); 
                batch.set(bookingRef, bookingDoc);
            }
            console.log("[data.ts] seedInitialData: Bookings prepared for batch.");
        } else {
            console.warn("[data.ts] seedInitialData: Not all expected rooms (Sunrise, Ocean) were referenced for booking seeding.");
        }
      } else {
          console.warn("[data.ts] seedInitialData: Granada location ID not found for room seeding.");
      }
      await batch.commit();
      console.log("[data.ts] seedInitialData: Initial data batch committed successfully to Firestore.");
    } else {
      console.log(`[data.ts] seedInitialData: Locations collection is not empty (${locationSnapshot.size} docs found). Skipping seed.`);
    }
  } catch (error) {
    console.error("[data.ts] seedInitialData: Error during seeding process:", error);
  }
};
