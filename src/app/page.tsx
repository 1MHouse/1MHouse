
"use client";

import { useState, useEffect, useCallback } from 'react';
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
  
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingLocationData, setIsLoadingLocationData] = useState(false);
  const [isSeeding, setIsSeeding] = useState(true);
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  // Effect for initial seeding and loading all locations
  useEffect(() => {
    const initialLoad = async () => {
      console.log("[page.tsx] useEffect[initialLoad]: Running initial load and seed check...");
      setIsLoadingLocations(true);
      setIsSeeding(true); 

      try {
        await seedInitialData();
        console.log("[page.tsx] useEffect[initialLoad]: Seeding attempt complete.");
      } catch (error) {
        console.error("[page.tsx] useEffect[initialLoad]: Error during seeding:", error);
      }
      setIsSeeding(false); 

      try {
        console.log("[page.tsx] useEffect[initialLoad]: Loading initial locations from Firestore...");
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        console.log(`[page.tsx] useEffect[initialLoad]: Successfully set ${fetchedLocations.length} locations to state.`);
        
        if (fetchedLocations.length > 0) {
          // Default to first location. Further refinement for specific default (e.g., "Granada, Spain") can be added here.
          console.log(`[page.tsx] useEffect[initialLoad]: Defaulting to first available location: ${fetchedLocations[0].id}`);
          setSelectedLocationId(fetchedLocations[0].id);
        } else {
           console.log("[page.tsx] useEffect[initialLoad]: No locations found after seeding. Clearing selected location.");
           setSelectedLocationId(undefined);
        }
      } catch (error) {
        console.error("[page.tsx] useEffect[initialLoad]: Error fetching locations:", error);
        setAllLocations([]);
        setSelectedLocationId(undefined);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  // Effect for fetching rooms and bookings when selectedLocationId changes (and not during seeding/initial load)
  useEffect(() => {
    const fetchLocationSpecificData = async () => {
      // Only fetch if a location is selected AND initial loading/seeding is complete
      if (selectedLocationId && !isSeeding && !isLoadingLocations) {
        console.log(`[page.tsx] useEffect[selectedLocationId]: Location selected: ${selectedLocationId}. Fetching rooms/bookings...`);
        setIsLoadingLocationData(true);
        try {
          const [fetchedRooms, fetchedBookings] = await Promise.all([
            getRooms(selectedLocationId),
            getBookingsByLocation(selectedLocationId)
          ]);
          setAllRoomsForSelectedLocation(fetchedRooms);
          setAllBookingsForSelectedLocation(fetchedBookings);
          console.log(`[page.tsx] useEffect[selectedLocationId]: Fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${selectedLocationId}`);
        } catch (error) {
            console.error(`[page.tsx] useEffect[selectedLocationId]: Error fetching data for location ${selectedLocationId}:`, error);
            setAllRoomsForSelectedLocation([]);
            setAllBookingsForSelectedLocation([]);
        } finally {
            setIsLoadingLocationData(false);
        }
      } else if (!selectedLocationId && !isSeeding && !isLoadingLocations) {
        // Clear data if no location is selected (and not in initial loading phase)
        console.log("[page.tsx] useEffect[selectedLocationId]: No location selected or initial load in progress, clearing rooms/bookings.");
        setAllRoomsForSelectedLocation([]);
        setAllBookingsForSelectedLocation([]);
        setIsLoadingLocationData(false); 
      }
    };
    
    fetchLocationSpecificData();
  // Dependencies: run when selectedLocationId changes, or when isSeeding/isLoadingLocations flags change state after initial load.
  }, [selectedLocationId, isSeeding, isLoadingLocations]);


  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleDataUpdate = useCallback(async () => {
    console.log("[page.tsx] handleDataUpdate: Data update triggered. Refetching locations and current location data.");
    
    // Indicate loading for both location list and specific location data
    setIsLoadingLocations(true);
    // If a location is selected, also indicate its data is being loaded/refreshed
    if (selectedLocationId) {
        setIsLoadingLocationData(true);
    }
    
    try {
        // Refetch all locations
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        console.log(`[page.tsx] handleDataUpdate: Refetched ${fetchedLocations.length} locations.`);

        // Logic to re-evaluate selectedLocationId
        let newSelectedIdToSet = selectedLocationId;
        if (fetchedLocations.length > 0) {
            if (!newSelectedIdToSet || !fetchedLocations.find(loc => loc.id === newSelectedIdToSet)) {
                // If no location was selected, or current selection is no longer valid, default to first
                newSelectedIdToSet = fetchedLocations[0].id;
                console.log(`[page.tsx] handleDataUpdate: Defaulting/resetting selected location to ${newSelectedIdToSet}`);
            }
        } else {
            // No locations exist anymore
            newSelectedIdToSet = undefined;
            console.log(`[page.tsx] handleDataUpdate: No locations found. Clearing selected location.`);
        }
        
        // If selectedLocationId changes, the useEffect for it will trigger data fetching.
        // If it's the same, we need to manually refetch its data below.
        setSelectedLocationId(newSelectedIdToSet);

        // If a location is (still) selected, refetch its rooms and bookings
        if (newSelectedIdToSet) {
            console.log(`[page.tsx] handleDataUpdate: Refetching data for selected location ${newSelectedIdToSet}.`);
            const [fetchedRooms, fetchedBookings] = await Promise.all([
                getRooms(newSelectedIdToSet),
                getBookingsByLocation(newSelectedIdToSet)
            ]);
            setAllRoomsForSelectedLocation(fetchedRooms);
            setAllBookingsForSelectedLocation(fetchedBookings);
            console.log(`[page.tsx] handleDataUpdate: Re-fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${newSelectedIdToSet}`);
        } else {
            // No location selected, clear room/booking data
            setAllRoomsForSelectedLocation([]);
            setAllBookingsForSelectedLocation([]);
        }

    } catch (error) {
        console.error(`[page.tsx] handleDataUpdate: Error refetching data:`, error);
        setAllRoomsForSelectedLocation([]); // Clear data on error
        setAllBookingsForSelectedLocation([]);
    } finally {
        setIsLoadingLocations(false);
        setIsLoadingLocationData(false); // Ensure this is reset
    }
  }, [selectedLocationId]); // Re-run if selectedLocationId might influence re-selection logic

  const handleLocationChange = (newLocationId: string) => {
    console.log(`[page.tsx] handleLocationChange: Location changed by user to ${newLocationId}`);
    setSelectedLocationId(newLocationId); 
  };
  
  const overallLoading = isLoadingAuth || (isLoadingLocations && !allLocations.length); // Simplified: only show full page loader if truly initial loading

  if (overallLoading) { 
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2">
            {isLoadingAuth ? "Loading authentication..." : 
             isSeeding && isLoadingLocations ? "Initializing data & loading locations..." : // Combined message if both true
             isSeeding ? "Initializing data..." :
             isLoadingLocations ? "Loading locations..." : "Loading..."}
          </p>
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
              {isLoadingLocations && allLocations.length === 0 ? ( 
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Loading locations...</span>
                </div>
              ) : allLocations.length > 0 ? (
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
              ) : ( 
                <p className="text-muted-foreground">No locations available. Admin can add locations.</p>
              ) }
            </CardHeader>
          </Card>
          
          {isLoadingLocationData && selectedLocationId && ( // Show loader only if specific location data is being fetched
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading calendar data for {allLocations.find(l=>l.id === selectedLocationId)?.name}...</span>
            </div>
          )}

          {!isLoadingLocationData && selectedLocationId && (
            <>
              <CalendarNavigation currentDate={currentDate} onNavigate={handleNavigate} />
              <AvailabilityCalendar
                key={selectedLocationId} 
                rooms={allRoomsForSelectedLocation}
                initialBookings={allBookingsForSelectedLocation} 
                currentDisplayDate={currentDate}
                onBookingUpdate={handleDataUpdate}
                allRooms={allRoomsForSelectedLocation} // TODO: This should probably be all rooms from all locations for dialogs
                allLocations={allLocations}
              />
            </>
          )}
          
          {!selectedLocationId && !isLoadingLocations && !isSeeding && allLocations.length > 0 && (
             <Card className="shadow-md text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground">Please select a location to view its availability calendar.</p>
                </CardContent>
             </Card>
          )}

           {!isLoadingLocations && !isSeeding && allLocations.length === 0 && ( 
             <Card className="shadow-md text-center py-10">
                <CardHeader>
                    <CardTitle className="text-destructive">No Locations Configured</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No locations have been set up for 1M House.</p>
                    {isAdmin && (
                        <p className="mt-2 text-sm">
                            You can <Link href="/admin/locations" className="underline text-primary hover:text-primary/80">add locations</Link> in the admin panel.
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

    