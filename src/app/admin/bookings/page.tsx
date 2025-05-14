
import { BookingManagement } from '@/components/admin/booking-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <BookOpen className="h-7 w-7 mr-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Booking Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>View, create, edit, and delete bookings for 1M House.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingManagement />
        </CardContent>
      </Card>
    </div>
  );
}
