
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
  
  const [allRooms, setAllRooms] = useState<Room[]>([]); 
  const [allBookings, setAllBookings] = useState<Booking[]>([]); 
  const [allLocations, setAllLocations] = useState<Location[]>([]); 
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  // Seeding useEffect - runs once on mount
  useEffect(() => {
    const attemptSeedAndLoad = async () => {
      console.log("[page.tsx] useEffect[seed]: Attempting to seed initial data...");
      try {
        await seedInitialData(); // This now logs internally if it skips or seeds
        console.log("[page.tsx] useEffect[seed]: seedInitialData call completed.");
      } catch (error) {
        console.error("[page.tsx] useEffect[seed]: Error during seedInitialData call:", error);
      }
      // After attempting to seed, load initial data to reflect any changes or existing data.
      await loadInitialData();
    };
    
    const loadInitialData = async () => {
      setIsLoadingData(true);
      console.log("[page.tsx] loadInitialData: Loading initial locations...");
      try {
        const fetchedLocations = await getLocations(); // getLocations now logs its result
        setAllLocations(fetchedLocations);
        console.log(`[page.tsx] loadInitialData: Successfully set ${fetchedLocations.length} locations to state.`);
        
        if (fetchedLocations.length > 0) {
          // If selectedLocationId is already set and valid, keep it. 
          // Otherwise, default to the first one.
          const currentSelectedIsValid = fetchedLocations.find(loc => loc.id === selectedLocationId);
          let newSelectedLocationId = selectedLocationId;

          if (!currentSelectedIsValid) {
            newSelectedLocationId = fetchedLocations[0].id;
            console.log(`[page.tsx] loadInitialData: No valid location selected or previous selection invalid. Defaulting to first location: ${newSelectedLocationId}`);
            // Setting selectedLocationId here will trigger the other useEffect to fetch data for this location
            setSelectedLocationId(newSelectedLocationId); 
          } else {
            console.log(`[page.tsx] loadInitialData: Current selected location ${selectedLocationId} is still valid. Re-fetching its data as a precaution.`);
            // Fetch data for the currently selected location if it hasn't changed, to ensure freshness
             await fetchDataForLocation(selectedLocationId!);
          }
        } else {
          console.log("[page.tsx] loadInitialData: No locations found after fetch attempt. Clearing rooms, bookings, and selected location.");
          setAllRooms([]);
          setAllBookings([]);
          setSelectedLocationId(undefined); 
          setIsLoadingData(false); // No data to load if no locations
        }
      } catch (error) {
        console.error("[page.tsx] loadInitialData: Error fetching initial locations:", error);
        setAllLocations([]); // Ensure state is cleared on error
        setAllRooms([]);
        setAllBookings([]);
        setSelectedLocationId(undefined);
        setIsLoadingData(false); // Stop loading on error
      }
    };

    attemptSeedAndLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  const fetchDataForLocation = useCallback(async (locationId: string) => {
    if (!locationId) {
      console.log("[page.tsx] fetchDataForLocation: No locationId provided, skipping fetch.");
      setIsLoadingData(false); // Ensure loading stops if no ID
      return;
    }
    setIsLoadingData(true);
    console.log(`[page.tsx] fetchDataForLocation: Fetching rooms and bookings for location: ${locationId}`);
    try {
      const [fetchedRooms, fetchedBookings] = await Promise.all([
        getRooms(locationId),
        getBookingsByLocation(locationId),
      ]);
      console.log(`[page.tsx] fetchDataForLocation: Fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${locationId}`);
      setAllRooms(fetchedRooms);
      setAllBookings(fetchedBookings);
    } catch (error) {
      console.error(`[page.tsx] fetchDataForLocation: Error fetching data for location ${locationId}:`, error);
      setAllRooms([]);
      setAllBookings([]);
    } finally {
      setIsLoadingData(false);
      console.log(`[page.tsx] fetchDataForLocation: Finished fetching for location ${locationId}, isLoadingData: false.`);
    }
  }, []);


  // This effect specifically handles fetching data when selectedLocationId changes
  useEffect(() => {
    if (selectedLocationId) {
      console.log(`[page.tsx] useEffect[selectedLocationId]: selectedLocationId changed to ${selectedLocationId}. Fetching data...`);
      fetchDataForLocation(selectedLocationId);
    } else if (allLocations.length === 0 && !isLoadingData){ // Only if locations are confirmed empty and not already loading
      console.log("[page.tsx] useEffect[selectedLocationId]: No location selected and no locations exist. Clearing rooms and bookings.");
      setAllRooms([]);
      setAllBookings([]);
      // setIsLoadingData(false); // Already handled by loadInitialData or fetchDataForLocation if selectedLocationId was cleared
    }
  }, [selectedLocationId, fetchDataForLocation, allLocations.length, isLoadingData]);


  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleBookingUpdate = () => {
    console.log("[page.tsx] handleBookingUpdate: Booking updated. Refetching data for current location.");
    if (selectedLocationId) {
      fetchDataForLocation(selectedLocationId); 
    }
  };

  const handleLocationChange = (newLocationId: string) => {
    console.log(`[page.tsx] handleLocationChange: Location changed to ${newLocationId}`);
    setSelectedLocationId(newLocationId); 
  };
  
  const filteredRooms = useMemo(() => allRooms, [allRooms]);
  const filteredBookings = useMemo(() => allBookings, [allBookings]);

  // console.log(`[page.tsx] Rendering UI. isLoadingAuth: ${isLoadingAuth}, isLoadingData: ${isLoadingData}, allLocations count: ${allLocations.length}, selectedLocationId: ${selectedLocationId}`);


  if (isLoadingAuth) { 
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2">Loading authentication...</p>
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
                // Show this only if not loading AND no locations truly exist
                <p className="text-muted-foreground">No locations available. Admin can add locations.</p>
              ) : null }
            </CardHeader>
          </Card>
          
          {/* General loading state for data fetching or initial setup */}
          {isLoadingData && ( 
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading data...</span>
            </div>
          )}

          {/* Calendar display section - only if not loading AND a location is selected */}
          {!isLoadingData && selectedLocationId && (
            <>
              <CalendarNavigation currentDate={currentDate} onNavigate={handleNavigate} />
              <AvailabilityCalendar
                key={selectedLocationId} 
                rooms={filteredRooms}
                initialBookings={filteredBookings} 
                currentDisplayDate={currentDate}
                onBookingUpdate={handleBookingUpdate}
                allRooms={allRooms} // This should be all rooms from all locations for admin dialogs potentially
                allLocations={allLocations} // Pass all locations for context
              />
            </>
          )}
          
          {/* Message if locations exist but none selected */}
          {!isLoadingData && allLocations.length > 0 && !selectedLocationId && (
             <Card className="shadow-md text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground">Please select a location to view its availability calendar.</p>
                </CardContent>
             </Card>
          )}

          {/* Message if truly no locations configured after loading attempt */}
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
              {/* Content can be added here if needed */}
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

    