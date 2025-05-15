
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
  
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingLocationData, setIsLoadingLocationData] = useState(false);
  const [isSeeding, setIsSeeding] = useState(true); // Tracks if seeding process is active
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  // Effect for initial seeding and loading all locations
  useEffect(() => {
    const initialLoad = async () => {
      console.log("[page.tsx] useEffect[initialLoad]: Running initial load and seed check...");
      setIsLoadingLocations(true);
      setIsSeeding(true); // Indicate seeding is in progress

      try {
        await seedInitialData();
        console.log("[page.tsx] useEffect[initialLoad]: Seeding attempt complete.");
      } catch (error) {
        console.error("[page.tsx] useEffect[initialLoad]: Error during seeding:", error);
      }
      // Seeding process is finished, regardless of outcome
      setIsSeeding(false); 

      try {
        console.log("[page.tsx] useEffect[initialLoad]: Loading initial locations from Firestore...");
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        console.log(`[page.tsx] useEffect[initialLoad]: Successfully set ${fetchedLocations.length} locations to state.`);
        
        if (fetchedLocations.length > 0) {
          const granadaLocation = fetchedLocations.find(loc => loc.name.toLowerCase() === "granada, spain");
          if (granadaLocation) {
            console.log(`[page.tsx] useEffect[initialLoad]: Defaulting to Granada, Spain: ${granadaLocation.id}`);
            setSelectedLocationId(granadaLocation.id);
          } else {
            // If Granada not found, default to the first available location
            console.log(`[page.tsx] useEffect[initialLoad]: 'Granada, Spain' not found. Defaulting to first available location: ${fetchedLocations[0].id}`);
            setSelectedLocationId(fetchedLocations[0].id);
          }
        } else {
           console.log("[page.tsx] useEffect[initialLoad]: No locations found after seeding. Clearing selected location.");
           setSelectedLocationId(undefined); // No locations, so no selection
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
  }, []); // Empty dependency array: runs only once on mount

  // Effect for fetching rooms and bookings when selectedLocationId changes (and not during seeding)
  useEffect(() => {
    const fetchLocationSpecificData = async () => {
      if (selectedLocationId && !isSeeding && !isLoadingLocations) { // Ensure seeding and location loading is done
        console.log(`[page.tsx] useEffect[selectedLocationId]: Location selected: ${selectedLocationId}. Fetching rooms/bookings...`);
        setIsLoadingLocationData(true);
        try {
          const fetchedRooms = await getRooms(selectedLocationId);
          const fetchedBookings = await getBookingsByLocation(selectedLocationId);
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
        console.log("[page.tsx] useEffect[selectedLocationId]: No location selected, clearing rooms/bookings.");
        setAllRoomsForSelectedLocation([]);
        setAllBookingsForSelectedLocation([]);
        setIsLoadingLocationData(false); 
      }
    };
    
    // Only run if not currently loading locations, to avoid race conditions with initialLoad
    if(!isLoadingLocations) {
        fetchLocationSpecificData();
    }
  }, [selectedLocationId, isSeeding, isLoadingLocations]);


  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleDataUpdate = useCallback(async () => {
    console.log("[page.tsx] handleDataUpdate: Data update triggered. Refetching...");
    setIsLoadingLocationData(true); // For specific location data
    setIsLoadingLocations(true); // For all locations
    
    try {
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);

        // Determine the ID to re-select. Prioritize Granada, then current, then first.
        let newSelectedIdToSet: string | undefined = undefined;
        if (fetchedLocations.length > 0) {
            const granadaLocation = fetchedLocations.find(loc => loc.name.toLowerCase() === "granada, spain");
            if (granadaLocation) {
                newSelectedIdToSet = granadaLocation.id;
            } else {
                const currentSelectionStillValid = selectedLocationId && fetchedLocations.find(loc => loc.id === selectedLocationId);
                newSelectedIdToSet = currentSelectionStillValid ? selectedLocationId : fetchedLocations[0].id;
            }
        }
        
        // Update selectedLocationId. The useEffect for selectedLocationId will handle fetching its data.
        setSelectedLocationId(newSelectedIdToSet);

        // If selectedLocationId happens to be the same, the above won't trigger the effect,
        // so we might need to manually re-fetch if we expect data for *that same ID* to have changed.
        // However, most CRUD ops (add/delete location/room) would likely change selectedLocationId or its validity.
        // For simplicity, we'll rely on the selectedLocationId effect.
        // If a booking for the *current* location is updated, that effect should re-fetch anyway
        // if `onBookingUpdate` properly sets `selectedLocationId` or triggers a re-fetch.

    } catch (error) {
        console.error(`[page.tsx] handleDataUpdate: Error refetching data:`, error);
    } finally {
        // isLoadingLocationData will be set by the selectedLocationId effect if it runs
        // setIsLoadingLocationData(false); // Let the other effect handle this if ID changes
        setIsLoadingLocations(false);
    }
  }, [selectedLocationId]); // Include selectedLocationId to have its current value for re-selection logic

  const handleLocationChange = (newLocationId: string) => {
    console.log(`[page.tsx] handleLocationChange: Location changed by user to ${newLocationId}`);
    setSelectedLocationId(newLocationId); 
  };
  
  const filteredRooms = useMemo(() => allRoomsForSelectedLocation, [allRoomsForSelectedLocation]);
  const filteredBookings = useMemo(() => allBookingsForSelectedLocation, [allBookingsForSelectedLocation]);

  const overallLoading = isLoadingAuth || isLoadingLocations || isSeeding; // isSeeding covers the very initial phase

  if (overallLoading && !allLocations.length) { // Show full page loader only if truly initial or locations not yet fetched
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2">
            {isLoadingAuth ? "Loading authentication..." : 
             isSeeding ? "Initializing data..." : // isSeeding covers the seed part of initial load
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
              {isLoadingLocations && allLocations.length === 0 ? ( // Specific loader for select if locations are loading and none yet
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
          
          {isLoadingLocationData && ( // Loader for calendar data specifically
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading calendar data...</span>
            </div>
          )}

          {/* Calendar display logic */}
          {!isLoadingLocationData && selectedLocationId && (
            <>
              <CalendarNavigation currentDate={currentDate} onNavigate={handleNavigate} />
              <AvailabilityCalendar
                key={selectedLocationId} 
                rooms={filteredRooms}
                initialBookings={filteredBookings} 
                currentDisplayDate={currentDate}
                onBookingUpdate={handleDataUpdate} // This should re-trigger data fetching
                allRooms={allRooms} // Pass all rooms from all locations for booking dialog
                allLocations={allLocations}
              />
            </>
          )}
          
          {/* Message if no location is selected but locations exist */}
          {!selectedLocationId && !isLoadingLocations && allLocations.length > 0 && (
             <Card className="shadow-md text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground">Please select a location to view its availability calendar.</p>
                </CardContent>
             </Card>
          )}

          {/* Message if no locations are configured at all */}
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

    
