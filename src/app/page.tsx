
"use client";

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AvailabilityCalendar } from '@/components/calendar/availability-calendar';
import { CalendarNavigation } from '@/components/calendar/calendar-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { initialRooms, initialBookings, getRooms, getBookings } from '@/lib/data';
import type { Room, Booking } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { isAdmin, isLoading: isLoadingAuth } = useAuth();

  const fetchData = useCallback(() => {
    setIsLoadingData(true);
    // Simulate API call
    setTimeout(() => {
      setRooms(getRooms()); // Get a fresh copy in case it's mutated
      setBookings([...getBookings()]); // Get a fresh copy
      setIsLoadingData(false);
    }, 200); // Short delay to simulate async loading
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(current => direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
  };

  const handleBookingUpdate = () => {
    fetchData(); // Refetch or update bookings state
  };

  if (isLoadingAuth || isLoadingData) {
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
          <CalendarNavigation currentDate={currentDate} onNavigate={handleNavigate} />
          <AvailabilityCalendar 
            rooms={rooms} 
            initialBookings={bookings} 
            currentDisplayDate={currentDate}
            onBookingUpdate={handleBookingUpdate}
          />
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>{isAdmin ? "Admin Panel" : "Admin Access"}</CardTitle>
              <CardDescription>
                {isAdmin ? "Manage bookings and rooms." : "Login to access administrative features."}
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
        © {new Date().getFullYear()} Granada Getaway. All rights reserved.
      </footer>
    </div>
  );
}

    