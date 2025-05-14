
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AvailabilityCalendar } from '@/components/calendar/availability-calendar';
import { CalendarNavigation } from '@/components/calendar/calendar-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRooms, getBookingsByLocation, getLocations, seedInitialData } from '@/lib/data'; // Added seedInitialData
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

  // Seeding useEffect - runs once on mount to ensure initial data if DB is empty
  useEffect(() => {
    const attemptSeed = async () => {
      console.log("Checking if initial data seeding is required for Firestore...");
      await seedInitialData();
      // After attempting to seed, we might want to refresh the locations list
      // This will be handled by the loadInitialData effect.
    };
    attemptSeed();
  }, []);


  const fetchDataForLocation = useCallback(async (locationId: string) => {
    if (!locationId) return;
    setIsLoadingData(true);
    try {
      console.log(`Fetching rooms and bookings for location: ${locationId}`);
      const [fetchedRooms, fetchedBookings] = await Promise.all([
        getRooms(locationId),
        getBookingsByLocation(locationId),
      ]);
      console.log(`Fetched ${fetchedRooms.length} rooms and ${fetchedBookings.length} bookings for ${locationId}`);
      setAllRooms(fetchedRooms);
      setAllBookings(fetchedBookings);
    } catch (error) {
      console.error("Error fetching data for location:", error);
      setAllRooms([]);
      setAllBookings([]);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingData(true);
      console.log("Loading initial locations...");
      try {
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        console.log(`Fetched ${fetchedLocations.length} locations.`);
        if (fetchedLocations.length > 0) {
          // If selectedLocationId is already set and valid, keep it. Otherwise, default to the first one.
          const currentSelectedLocation = fetchedLocations.find(loc => loc.id === selectedLocationId) 
            ? selectedLocationId 
            : fetchedLocations[0].id;

          if (currentSelectedLocation !== selectedLocationId) {
            setSelectedLocationId(currentSelectedLocation); // This will trigger data fetch via the other useEffect
          } else {
             // If selectedLocationId didn't change but we need to fetch (e.g. initial load)
            await fetchDataForLocation(currentSelectedLocation!);
          }
        } else {
          console.log("No locations found after initial load attempt.");
          setAllRooms([]);
          setAllBookings([]);
          setSelectedLocationId(undefined); // Ensure no location is selected
          setIsLoadingData(false);
        }
      } catch (error) {
        console.error("Error fetching initial locations:", error);
        setAllLocations([]);
        setAllRooms([]);
        setAllBookings([]);
        setIsLoadingData(false);
      }
    };
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to load locations

  // This effect specifically handles fetching data when selectedLocationId changes
  useEffect(() => {
    if (selectedLocationId) {
      fetchDataForLocation(selectedLocationId);
    } else {
      // If no location is selected (e.g., after all locations are deleted)
      setAllRooms([]);
      setAllBookings([]);
      setIsLoadingData(false); // Not loading data for any specific location
    }
  }, [selectedLocationId, fetchDataForLocation]);


  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleBookingUpdate = () => {
    if (selectedLocationId) {
      fetchDataForLocation(selectedLocationId); 
    }
  };

  const handleLocationChange = (newLocationId: string) => {
    setSelectedLocationId(newLocationId); 
  };
  
  const filteredRooms = useMemo(() => allRooms, [allRooms]);
  const filteredBookings = useMemo(() => allBookings, [allBookings]);

  if (isLoadingAuth) { // Prioritize auth loading
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
              ) : !isLoadingData ? ( // Only show "No locations" if not loading and locations array is empty
                <p className="text-muted-foreground">No locations available. Admin can add locations.</p>
              ) : null }
            </CardHeader>
          </Card>
          
          {isLoadingData && ( // General loading state for data fetching activities
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading calendar data...</span>
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
                onBookingUpdate={handleBookingUpdate}
                allRooms={allRooms} 
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
           {!isLoadingData && allLocations.length === 0 && ( // This state implies initial load finished, and no locations were found/seeded
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
