
import { LocationManagement } from '@/components/admin/location-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function AdminLocationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <MapPin className="h-7 w-7 mr-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Location Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>Manage the property locations for 1M International.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocationManagement />
        </CardContent>
      </Card>
    </div>
  );
}
