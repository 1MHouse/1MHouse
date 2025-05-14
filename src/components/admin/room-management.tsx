
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Room } from '@/lib/types';
import { getRooms, deleteRoom as deleteRoomData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Dynamic import for RoomFormDialog
const RoomFormDialog = React.lazy(() => import('./room-form-dialog').then(module => ({ default: module.RoomFormDialog })));
import React from 'react'; // Required for React.lazy


export function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
    setRooms([...getRooms()]); // Use spread to ensure re-render if data object is mutated elsewhere
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchRooms();
  }, [fetchRooms]);

  const handleAddRoom = () => {
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

  const confirmDelete = async () => {
    if (roomToDelete) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
      const success = deleteRoomData(roomToDelete);
      if (success) {
        toast({ title: "Room Deleted", description: "The room has been successfully deleted." });
        fetchRooms(); // Refresh list
      } else {
        toast({ title: "Error", description: "Failed to delete room. It might be associated with bookings.", variant: "destructive" });
      }
      setRoomToDelete(null);
    }
    setIsAlertOpen(false);
  };

  const handleFormClose = (updated: boolean) => {
    setIsFormOpen(false);
    setSelectedRoom(undefined);
    if (updated) {
      fetchRooms();
    }
  };

  if (!isMounted || isLoading) {
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
        <Button onClick={handleAddRoom}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
         <p className="text-muted-foreground text-center py-4">No rooms found. Add a new room to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.name}</TableCell>
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
            />
        </React.Suspense>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room. Ensure no bookings are associated with this room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({variant: "destructive"})}>
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper for AlertDialog Action button styling
const buttonVariants = ({variant}: {variant?: "destructive" | "default"}) => {
  if (variant === "destructive") return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  return "";
}

    