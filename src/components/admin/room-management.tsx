
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Room, Location } from '@/lib/types';
import { getRooms, deleteRoom as deleteRoomData, getLocations } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

const RoomFormDialog = React.lazy(() => 
  import('./room-form-dialog').then(module => ({ default: module.RoomFormDialog }))
);

export function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setRooms([...getRooms()]); 
      setLocations([...getLocations()]);
      setIsLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, [fetchData]);

  const handleAddRoom = () => {
    if (locations.length === 0) {
      toast({ title: "No Locations", description: "Please add a location before adding rooms.", variant: "destructive"});
      return;
    }
    setSelectedRoom(undefined);
    setIsFormOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsFormOpen(true);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRoomToDelete(roomId);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (roomToDelete) {
      setIsLoading(true);
      setTimeout(() => {
        const success = deleteRoomData(roomToDelete);
        if (success) {
          toast({ title: "Room Deleted", description: "The room has been successfully deleted." });
          fetchData(); 
        } else {
          toast({ title: "Error Deleting Room", description: "Failed to delete room. It might be associated with bookings.", variant: "destructive" });
        }
        setRoomToDelete(null);
        setIsLoading(false);
        setIsAlertOpen(false);
      }, 300);
    } else {
      setIsAlertOpen(false);
    }
  };

  const handleFormClose = (updated: boolean) => {
    setIsFormOpen(false);
    setSelectedRoom(undefined);
    if (updated) {
      fetchData();
    }
  };

  const getLocationName = (locationId: string) => {
    return locations.find(loc => loc.id === locationId)?.name || 'Unknown Location';
  };

  if (!isMounted || isLoading && rooms.length === 0 && locations.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Manage Rooms</h2>
        <Button onClick={handleAddRoom} disabled={locations.length === 0}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Room
        </Button>
      </div>
      {isLoading && (rooms.length > 0 || locations.length > 0) && ( // Subtle loader for re-fetches
        <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Refreshing...</span>
        </div>
      )}
      {!isLoading && locations.length === 0 && (
        <p className="text-destructive text-center py-4">No locations found. Please add a location in the 'Locations' section before managing rooms.</p>
      )}

      {!isLoading && rooms.length === 0 && locations.length > 0 ? (
         <p className="text-muted-foreground text-center py-4">No rooms found for any location. Add a new room to get started.</p>
      ) : !isLoading && rooms.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell>{getLocationName(room.locationId)}</TableCell>
                <TableCell className="text-muted-foreground">{room.id}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditRoom(room)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteRoom(room.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isMounted && (
        <React.Suspense fallback={<div>Loading form...</div>}>
            <RoomFormDialog
            isOpen={isFormOpen}
            onClose={handleFormClose}
            room={selectedRoom}
            locations={locations}
            />
        </React.Suspense>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room. 
              Ensure no bookings are associated with this room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoomToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
