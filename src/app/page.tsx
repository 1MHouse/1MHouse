
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
  const [isSeeding, setIsSeeding] = useState(true); // Initially true to allow seeding check
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  // Effect for initial seeding and loading all locations
  useEffect(() => {
    const initialLoad = async () => {
      console.log("[page.tsx] useEffect[initialLoad]: Running initial load and seed check...");
      setIsLoadingLocations(true);
      setIsSeeding(true); // Set seeding to true before the attempt

      try {
        await seedInitialData();
        console.log("[page.tsx] useEffect[initialLoad]: Seeding attempt complete.");
      } catch (error) {
        console.error("[page.tsx] useEffect[initialLoad]: Error during seeding:", error);
      }
      //setIsSeeding(false); // Moved to finally block of location fetching

      try {
        console.log("[page.tsx] useEffect[initialLoad]: Loading initial locations from Firestore...");
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        console.log(`[page.tsx] useEffect[initialLoad]: Successfully set ${fetchedLocations.length} locations to state.`);
        
        if (fetchedLocations.length > 0) {
          const granadaLocation = fetchedLocations.find(loc => loc.name === "Granada, Spain");
          if (granadaLocation) {
            console.log(`[page.tsx] useEffect[initialLoad]: Defaulting to "Granada, Spain": ${granadaLocation.id}`);
            setSelectedLocationId(granadaLocation.id);
          } else {
            console.log(`[page.tsx] useEffect[initialLoad]: "Granada, Spain" not found. Defaulting to first available location: ${fetchedLocations[0].id}`);
            setSelectedLocationId(fetchedLocations[0].id);
          }
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
        setIsSeeding(false); // Seeding process is fully complete after locations are fetched/set
      }
    };
    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  // Effect for fetching rooms and bookings when selectedLocationId changes
  useEffect(() => {
    const fetchLocationSpecificData = async () => {
      if (selectedLocationId && !isSeeding) { // Only fetch if a location is selected AND initial seeding/loading is done
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
      } else if (!selectedLocationId && !isSeeding) {
        console.log("[page.tsx] useEffect[selectedLocationId]: No location selected, clearing rooms/bookings.");
        setAllRoomsForSelectedLocation([]);
        setAllBookingsForSelectedLocation([]);
        setIsLoadingLocationData(false); 
      }
    };
    
    fetchLocationSpecificData();
  }, [selectedLocationId, isSeeding]); // Re-run when selectedLocationId or isSeeding changes

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleDataUpdate = useCallback(async () => {
    console.log("[page.tsx] handleDataUpdate: Data update triggered. Refetching locations and current location data.");
    
    setIsLoadingLocations(true);
    if (selectedLocationId) {
        setIsLoadingLocationData(true);
    }
    
    try {
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        console.log(`[page.tsx] handleDataUpdate: Refetched ${fetchedLocations.length} locations.`);

        let currentSelectedLocationStillExists = false;
        if (selectedLocationId) {
          currentSelectedLocationStillExists = fetchedLocations.some(loc => loc.id === selectedLocationId);
        }

        if (!currentSelectedLocationStillExists && fetchedLocations.length > 0) {
          const granadaLocation = fetchedLocations.find(loc => loc.name === "Granada, Spain");
          const newSelectedId = granadaLocation ? granadaLocation.id : fetchedLocations[0].id;
          console.log(`[page.tsx] handleDataUpdate: Previous selection invalid or missing. Setting new selected location to ${newSelectedId}`);
          setSelectedLocationId(newSelectedId); 
        } else if (fetchedLocations.length === 0) {
          console.log(`[page.tsx] handleDataUpdate: No locations found after update. Clearing selected location.`);
          setSelectedLocationId(undefined);
          setAllRoomsForSelectedLocation([]);
          setAllBookingsForSelectedLocation([]);
        } else if (selectedLocationId && currentSelectedLocationStillExists) {
          // Current selection is still valid, just refresh its data
          console.log(`[page.tsx] handleDataUpdate: Refetching data for currently selected location ${selectedLocationId}.`);
          const [fetchedRooms, fetchedBookings] = await Promise.all([
              getRooms(selectedLocationId),
              getBookingsByLocation(selectedLocationId)
          ]);
          setAllRoomsForSelectedLocation(fetchedRooms);
          setAllBookingsForSelectedLocation(fetchedBookings);
          console.log(`[page.tsx] handleDataUpdate: Re-fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${selectedLocationId}`);
        }
    } catch (error) {
        console.error(`[page.tsx] handleDataUpdate: Error refetching data:`, error);
        setAllRoomsForSelectedLocation([]); 
        setAllBookingsForSelectedLocation([]);
    } finally {
        setIsLoadingLocations(false);
        setIsLoadingLocationData(false); 
    }
  // selectedLocationId is included because its current value might influence re-selection logic
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [selectedLocationId]); 

  const handleLocationChange = (newLocationId: string) => {
    console.log(`[page.tsx] handleLocationChange: Location changed by user to ${newLocationId}`);
    setSelectedLocationId(newLocationId); 
  };
  
  const overallLoading = isLoadingAuth || (isSeeding && isLoadingLocations);

  if (overallLoading) { 
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2">
            {isLoadingAuth ? "Loading authentication..." : 
             isSeeding ? "Initializing data..." : // Simplified if isSeeding is primary loader here
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
          
          {isLoadingLocationData && selectedLocationId && ( 
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
                allRooms={allRoomsForSelectedLocation} 
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
                    <p className="text-muted-foreground">No locations have been set up for 1M International.</p>
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
        © {new Date().getFullYear()} 1M International. All rights reserved.
      </footer>
    </div>
  );
}
