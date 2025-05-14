
import { RoomManagement } from '@/components/admin/room-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BedDouble } from 'lucide-react';

export default function AdminRoomsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <BedDouble className="h-7 w-7 mr-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Room Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Rooms</CardTitle>
          <CardDescription>Manage the rooms available at Granada Getaway.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomManagement />
        </CardContent>
      </Card>
    </div>
  );
}

    