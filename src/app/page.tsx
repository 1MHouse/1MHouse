
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AvailabilityCalendar } from '@/components/calendar/availability-calendar';
import { CalendarNavigation } from '@/components/calendar/calendar-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRooms, getBookings, getLocations } from '@/lib/data';
import type { Room, Booking, Location } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { Loader2, MapPin } from 'lucide-react';

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  const fetchData = useCallback(() => {
    setIsLoadingData(true);
    // Simulate API call
    setTimeout(() => {
      const fetchedLocations = getLocations();
      setLocations(fetchedLocations);
      if (fetchedLocations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(fetchedLocations[0].id);
      }
      setAllRooms(getRooms()); 
      setAllBookings([...getBookings()]);
      setIsLoadingData(false);
    }, 200);
  }, [selectedLocationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleBookingUpdate = () => {
    fetchData(); // Refetch all data
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const filteredRooms = useMemo(() => {
    if (!selectedLocationId) return [];
    return allRooms.filter(room => room.locationId === selectedLocationId);
  }, [allRooms, selectedLocationId]);

  const filteredBookings = useMemo(() => {
    if (!selectedLocationId) return [];
    const locationRoomIds = new Set(filteredRooms.map(room => room.id));
    return allBookings.filter(booking => locationRoomIds.has(booking.roomId));
  }, [allBookings, filteredRooms, selectedLocationId]);

  if (isLoadingAuth || isLoadingData || locations.length === 0) {
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
              {locations.length > 0 && selectedLocationId && (
                <Select onValueChange={handleLocationChange} defaultValue={selectedLocationId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
          </Card>

          <CalendarNavigation currentDate={currentDate} onNavigate={handleNavigate} />
          
          {selectedLocationId && (
            <AvailabilityCalendar
              key={selectedLocationId} // Re-mount calendar on location change
              rooms={filteredRooms}
              initialBookings={filteredBookings}
              currentDisplayDate={currentDate}
              onBookingUpdate={handleBookingUpdate}
              allRooms={allRooms} // Pass all rooms for dialog context if needed
              allLocations={locations} // Pass all locations
            />
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

