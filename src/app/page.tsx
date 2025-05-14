
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
  
  const [allRooms, setAllRooms] = useState<Room[]>([]); // All rooms for current selected location
  const [allBookings, setAllBookings] = useState<Booking[]>([]); // All bookings for current selected location
  const [allLocations, setAllLocations] = useState<Location[]>([]); // All locations available
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  // Function to seed data if needed (e.g., on first load or for demo)
  // Comment out or remove if you don't want to auto-seed
  useEffect(() => {
    const seed = async () => {
      // Check if locations exist, if not, seed.
      // This is a simple check; you might want a more robust way to do this.
      const currentLocations = await getLocations();
      if (currentLocations.length === 0) {
        await seedInitialData(); // This function is in data.ts
      }
    };
    // seed(); // Call this if you want to attempt seeding on component mount
  }, []);


  const fetchDataForLocation = useCallback(async (locationId: string) => {
    if (!locationId) return;
    setIsLoadingData(true);
    try {
      const [fetchedRooms, fetchedBookings] = await Promise.all([
        getRooms(locationId),
        getBookingsByLocation(locationId),
      ]);
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
      try {
        const fetchedLocations = await getLocations();
        setAllLocations(fetchedLocations);
        if (fetchedLocations.length > 0) {
          const currentSelectedLocation = selectedLocationId || fetchedLocations[0].id;
          setSelectedLocationId(currentSelectedLocation);
          await fetchDataForLocation(currentSelectedLocation);
        } else {
          setAllRooms([]);
          setAllBookings([]);
          setIsLoadingData(false); // No locations, so stop loading
        }
      } catch (error) {
        console.error("Error fetching initial locations:", error);
        setIsLoadingData(false);
      }
    };
    loadInitialData();
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
    // Data will be refetched by the useEffect watching selectedLocationId
  };
  
  // This memo is not strictly needed anymore as filteredRooms is just allRooms post-fetch
  // but kept for clarity that rooms are location-specific.
  const filteredRooms = useMemo(() => allRooms, [allRooms]);
  const filteredBookings = useMemo(() => allBookings, [allBookings]);

  if (isLoadingAuth || (isLoadingData && allLocations.length === 0 && !selectedLocationId)) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
              {allLocations.length > 0 && selectedLocationId ? (
                <Select onValueChange={handleLocationChange} value={selectedLocationId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : allLocations.length === 0 && !isLoadingData ? (
                <p className="text-muted-foreground">No locations available. Admin can add locations.</p>
              ) : null }
            </CardHeader>
          </Card>

          {isLoadingData && selectedLocationId && (
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
                initialBookings={filteredBookings} // Pass the already fetched bookings for this location
                currentDisplayDate={currentDate}
                onBookingUpdate={handleBookingUpdate}
                allRooms={[]} // For calendar cell click, rooms context is already current location
                allLocations={allLocations} 
              />
            </>
          )}
          
          {!selectedLocationId && !isLoadingData && allLocations.length > 0 && (
             <p className="text-center text-muted-foreground py-6">Please select a location to view availability.</p>
          )}
           {!selectedLocationId && !isLoadingData && allLocations.length === 0 && (
             <p className="text-center text-destructive py-6">No locations configured. Please ask an administrator to add locations.</p>
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
