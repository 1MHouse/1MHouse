
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
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  // Load initial data and potentially select a default location
  const loadInitialData = useCallback(() => {
    setIsLoadingData(true);
    console.log("[page.tsx - InMem] loadInitialData: Loading initial locations...");
    seedInitialData(); // For in-memory, this is a no-op but good for consistency
    
    const fetchedLocations = getLocations();
    setAllLocations(fetchedLocations);
    console.log(`[page.tsx - InMem] Successfully set ${fetchedLocations.length} locations to state.`);
    
    if (fetchedLocations.length > 0) {
      // If selectedLocationId is not set or invalid, default to the first one.
      const currentSelectedIsValid = selectedLocationId && fetchedLocations.find(loc => loc.id === selectedLocationId);
      let newSelectedLocationId = selectedLocationId;

      if (!currentSelectedIsValid) {
        newSelectedLocationId = fetchedLocations[0].id;
        console.log(`[page.tsx - InMem] No valid location selected or previous selection invalid. Defaulting to first location: ${newSelectedLocationId}`);
        setSelectedLocationId(newSelectedLocationId); 
        // Data for this location will be fetched by the useEffect watching selectedLocationId
      } else {
        console.log(`[page.tsx - InMem] Current selected location ${selectedLocationId} is still valid. Re-fetching its data.`);
        // Re-fetch data for the currently selected location
        const fetchedRooms = getRooms(selectedLocationId);
        const fetchedBookings = getBookingsByLocation(selectedLocationId);
        setAllRoomsForSelectedLocation(fetchedRooms);
        setAllBookingsForSelectedLocation(fetchedBookings);
      }
    } else {
      console.log("[page.tsx - InMem] No locations found. Clearing rooms, bookings, and selected location.");
      setAllRoomsForSelectedLocation([]);
      setAllBookingsForSelectedLocation([]);
      setSelectedLocationId(undefined); 
    }
    setIsLoadingData(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]); // Re-run if selectedLocationId changes externally to re-validate default

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]); // Initial load

  // This effect specifically handles fetching data when selectedLocationId changes
  useEffect(() => {
    if (selectedLocationId) {
      setIsLoadingData(true);
      console.log(`[page.tsx - InMem] useEffect[selectedLocationId]: selectedLocationId changed to ${selectedLocationId}. Fetching data...`);
      const fetchedRooms = getRooms(selectedLocationId);
      const fetchedBookings = getBookingsByLocation(selectedLocationId);
      setAllRoomsForSelectedLocation(fetchedRooms);
      setAllBookingsForSelectedLocation(fetchedBookings);
      console.log(`[page.tsx - InMem] Fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${selectedLocationId}`);
      setIsLoadingData(false);
    } else if (allLocations.length === 0 && !isLoadingData){ 
      console.log("[page.tsx - InMem] useEffect[selectedLocationId]: No location selected and no locations exist. Clearing rooms and bookings.");
      setAllRoomsForSelectedLocation([]);
      setAllBookingsForSelectedLocation([]);
    }
  }, [selectedLocationId, allLocations.length, isLoadingData]);


  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleDataUpdate = () => {
    console.log("[page.tsx - InMem] handleDataUpdate: Data updated (e.g. booking, room, location). Refetching.");
    // For in-memory, a full re-load might be simplest to reflect changes from admin panel
    loadInitialData(); 
  };

  const handleLocationChange = (newLocationId: string) => {
    console.log(`[page.tsx - InMem] handleLocationChange: Location changed to ${newLocationId}`);
    setSelectedLocationId(newLocationId); 
  };
  
  const filteredRooms = useMemo(() => allRoomsForSelectedLocation, [allRoomsForSelectedLocation]);
  const filteredBookings = useMemo(() => allBookingsForSelectedLocation, [allBookingsForSelectedLocation]);


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
                onBookingUpdate={handleDataUpdate}
                allRooms={getRooms()} 
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
