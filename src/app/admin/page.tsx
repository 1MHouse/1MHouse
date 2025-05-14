
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, BedDouble, LayoutDashboard } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <LayoutDashboard className="mr-3 h-8 w-8" />
          Admin Dashboard
        </h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Welcome, Admin!</CardTitle>
          <CardDescription>Manage your property bookings and room configurations from here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium text-primary">Booking Management</CardTitle>
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View, add, edit, or remove guest bookings. Keep your availability calendar up to date.
              </p>
              <Link href="/admin/bookings" passHref>
                <Button>Manage Bookings</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium text-primary">Room Management</CardTitle>
              <BedDouble className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your property's rooms. Add new rooms or edit existing details.
              </p>
              <Link href="/admin/rooms" passHref>
                <Button>Manage Rooms</Button>
              </Link>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

    