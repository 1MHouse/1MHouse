
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface CalendarNavigationProps {
  currentDate: Date;
  onNavigate: (direction: "prev" | "next") => void;
  viewType?: "week" | "month"; // To adjust label if needed
}

export function CalendarNavigation({ currentDate, onNavigate, viewType = "week" }: CalendarNavigationProps) {
  // For week view, show current month or week range. For simplicity, show month.
  const displayDate = format(currentDate, "MMMM yyyy");

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <Button variant="outline" size="icon" onClick={() => onNavigate("prev")} aria-label="Previous week">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-semibold text-foreground">
        {displayDate}
      </h2>
      <Button variant="outline" size="icon" onClick={() => onNavigate("next")} aria-label="Next week">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

    