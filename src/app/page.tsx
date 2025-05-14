
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AvailabilityCalendar } from '@/components/calendar/availability-calendar';
import { CalendarNavigation } from '@/components/calendar/calendar-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRooms, getBookingsByLocation, getLocations, seedInitialData } from '@/lib/data'; 
import type { Room, Booking, Location } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { Loader2, MapPin } from 'lucide-react';

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [allRoomsForSelectedLocation, setAllRoomsForSelectedLocation] = useState<Room[]>([]); 
  const [allBookingsForSelectedLocation, setAllBookingsForSelectedLocation] = useState<Booking[]>([]); 
  const [allLocations, setAllLocations] = useState<Location[]>([]); 
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSeeding, setIsSeeding] = useState(true); // For initial seed check
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  const attemptSeedAndLoad = useCallback(async () => {
    console.log("[page.tsx] useEffect[seed]: Attempting to seed initial data...");
    setIsLoadingData(true);
    setIsSeeding(true);
    try {
      await seedInitialData(); // Attempt to seed if necessary
      console.log("[page.tsx] useEffect[seed]: Seeding attempt complete.");
    } catch (error) {
      console.error("[page.tsx] useEffect[seed]: Error during seeding:", error);
    }
    setIsSeeding(false);
    
    // After seeding (or skipping seed), load locations
    try {
      console.log("[page.tsx] loadInitialData: Loading initial locations from Firestore...");
      const fetchedLocations = await getLocations();
      setAllLocations(fetchedLocations);
      console.log(`[page.tsx] loadInitialData: Successfully set ${fetchedLocations.length} locations to state.`);
      
      if (fetchedLocations.length > 0) {
        const currentSelectedIsValid = selectedLocationId && fetchedLocations.find(loc => loc.id === selectedLocationId);
        if (!currentSelectedIsValid) {
          console.log(`[page.tsx] loadInitialData: No valid location selected or previous selection invalid. Defaulting to first location: ${fetchedLocations[0].id}`);
          // setSelectedLocationId will trigger another useEffect to load rooms/bookings
          setSelectedLocationId(fetchedLocations[0].id); 
        } else {
          // If current selection is valid, trigger data fetch for it (handled by selectedLocationId useEffect)
          // This ensures data reloads if 'allLocations' array identity changes but selectedId is still valid
           console.log(`[page.tsx] loadInitialData: Current location ${selectedLocationId} is valid. Data will be fetched by selectedLocationId effect.`);
        }
      } else {
        console.log("[page.tsx] loadInitialData: No locations found after seeding attempt. Clearing rooms, bookings, and selected location.");
        setAllRoomsForSelectedLocation([]);
        setAllBookingsForSelectedLocation([]);
        setSelectedLocationId(undefined); 
      }
    } catch (error) {
      console.error("[page.tsx] loadInitialData: Error fetching locations:", error);
      setAllLocations([]); // Ensure it's an empty array on error
    } finally {
      setIsLoadingData(false); // General loading done after locations attempt
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]); // Re-run if selectedLocationId changes externally (e.g. admin delete)

  useEffect(() => {
    attemptSeedAndLoad();
  }, [attemptSeedAndLoad]); // Initial load and seed check


  // This effect specifically handles fetching data when selectedLocationId changes
  useEffect(() => {
    const fetchLocationData = async () => {
      if (selectedLocationId) {
        setIsLoadingData(true);
        console.log(`[page.tsx] useEffect[selectedLocationId]: selectedLocationId changed to ${selectedLocationId}. Fetching data from Firestore...`);
        try {
          const fetchedRooms = await getRooms(selectedLocationId);
          const fetchedBookings = await getBookingsByLocation(selectedLocationId);
          setAllRoomsForSelectedLocation(fetchedRooms);
          setAllBookingsForSelectedLocation(fetchedBookings);
          console.log(`[page.tsx] Fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${selectedLocationId}`);
        } catch (error) {
            console.error(`[page.tsx] Error fetching data for location ${selectedLocationId}:`, error);
            setAllRoomsForSelectedLocation([]);
            setAllBookingsForSelectedLocation([]);
        } finally {
            setIsLoadingData(false);
        }
      } else if (allLocations.length === 0 && !isSeeding && !isLoadingData){ 
        console.log("[page.tsx] useEffect[selectedLocationId]: No location selected and no locations exist. Clearing rooms and bookings.");
        setAllRoomsForSelectedLocation([]);
        setAllBookingsForSelectedLocation([]);
        setIsLoadingData(false); // Ensure loading stops
      } else if (!selectedLocationId && allLocations.length > 0) {
        // Locations exist, but none selected (e.g. after deleting the selected one)
        setAllRoomsForSelectedLocation([]);
        setAllBookingsForSelectedLocation([]);
        setIsLoadingData(false); 
      }
    };
    
    if (!isSeeding) { // Only run if not currently in the initial seeding phase
        fetchLocationData();
    }
  }, [selectedLocationId, allLocations.length, isSeeding, isLoadingData]);


  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  // This function will be called by child components (like admin forms) to signal data has changed
  const handleDataUpdate = useCallback(async () => {
    console.log("[page.tsx] handleDataUpdate: Data updated. Refetching current location's data.");
    setIsLoadingData(true);
    if (selectedLocationId) {
        try {
            const fetchedRooms = await getRooms(selectedLocationId);
            const fetchedBookings = await getBookingsByLocation(selectedLocationId);
            setAllRoomsForSelectedLocation(fetchedRooms);
            setAllBookingsForSelectedLocation(fetchedBookings);
            
            // Also refetch all locations in case a location was added/deleted
            const fetchedLocations = await getLocations();
            setAllLocations(fetchedLocations);
            // If the currently selected location was deleted, this will deselect it
            if (!fetchedLocations.find(loc => loc.id === selectedLocationId)) {
                setSelectedLocationId(fetchedLocations.length > 0 ? fetchedLocations[0].id : undefined);
            }

        } catch (error) {
            console.error(`[page.tsx] handleDataUpdate: Error refetching data for location ${selectedLocationId}:`, error);
        } finally {
            setIsLoadingData(false);
        }
    } else {
        // If no location is selected, just refetch all locations
        try {
            const fetchedLocations = await getLocations();
            setAllLocations(fetchedLocations);
            if (fetchedLocations.length > 0 && !selectedLocationId) {
                setSelectedLocationId(fetchedLocations[0].id); // Default to first if none selected
            }
        } catch (error) {
            console.error("[page.tsx] handleDataUpdate: Error refetching all locations:", error);
        } finally {
            setIsLoadingData(false);
        }
    }
  }, [selectedLocationId]);

  const handleLocationChange = (newLocationId: string) => {
    console.log(`[page.tsx] handleLocationChange: Location changed to ${newLocationId}`);
    setSelectedLocationId(newLocationId); 
  };
  
  const filteredRooms = useMemo(() => allRoomsForSelectedLocation, [allRoomsForSelectedLocation]);
  const filteredBookings = useMemo(() => allBookingsForSelectedLocation, [allBookingsForSelectedLocation]);


  if (isLoadingAuth || isSeeding) { 
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2">{isLoadingAuth ? "Loading authentication..." : "Initializing data..."}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center">
                 <MapPin className="h-6 w-6 mr-2 text-primary" />
                 <CardTitle>Select Location</CardTitle>
              </div>
              {allLocations.length > 0 ? (
                <Select onValueChange={handleLocationChange} value={selectedLocationId || ''}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (!isLoadingData && allLocations.length === 0) ? ( 
                <p className="text-muted-foreground">No locations available. Admin can add locations.</p>
              ) : null }
            </CardHeader>
          </Card>
          
          {isLoadingData && ( 
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading data...</span>
            </div>
          )}

          {!isLoadingData && selectedLocationId && (
            <>
              <CalendarNavigation currentDate={currentDate} onNavigate={handleNavigate} />
              <AvailabilityCalendar
                key={selectedLocationId} 
                rooms={filteredRooms}
                initialBookings={filteredBookings} 
                currentDisplayDate={currentDate}
                onBookingUpdate={handleDataUpdate} // Pass the callback
                allRooms={allRoomsForSelectedLocation} // Pass all rooms for current location, could be improved to pass all rooms from all locations if dialog needs it
                allLocations={allLocations}
              />
            </>
          )}
          
          {!isLoadingData && allLocations.length > 0 && !selectedLocationId && (
             <Card className="shadow-md text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground">Please select a location to view its availability calendar.</p>
                </CardContent>
             </Card>
          )}

           {!isLoadingData && allLocations.length === 0 && ( 
             <Card className="shadow-md text-center py-10">
                <CardContent>
                    <p className="text-destructive">No locations configured for 1M House.</p>
                    {isAdmin && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            You can <Link href="/admin/locations" className="underline text-primary">add locations</Link> in the admin panel.
                        </p>
                    )}
                </CardContent>
             </Card>
          )}


          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>{isAdmin ? "Admin Panel" : "Admin Access"}</CardTitle>
              <CardDescription>
                {isAdmin ? "Manage bookings, rooms, and locations." : "Login to access administrative features."}
              </CardDescription>
            </CardHeader>
            <CardContent>
            </CardContent>
            <CardFooter>
              {isAdmin ? (
                <Link href="/admin" passHref>
                  <Button>Go to Admin Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login" passHref>
                  <Button>Admin Login</Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 1M House. All rights reserved.
      </footer>
    </div>
  );
}
