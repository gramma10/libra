import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { bookingErrorMessage } from "@/lib/booking-errors";

export interface DragDropTarget {
  staffId: string;
  hour: number;
  minutes: number;
  day?: Date;
}

export function useAppointmentDragDrop(onSuccess: () => void) {
  const [draggingAppt, setDraggingAppt] = useState<any | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, appt: any) => {
    setDraggingAppt(appt);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    try { e.dataTransfer.setData("text/plain", appt.id); } catch {}
  };

  const handleDragEnd = () => {
    setDraggingAppt(null);
    setDragOverKey(null);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!draggingAppt) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKey !== key) setDragOverKey(key);
  };

  const handleDrop = async (e: React.DragEvent, target: DragDropTarget) => {
    e.preventDefault();
    if (!draggingAppt) return;
    const appt = draggingAppt;
    setDraggingAppt(null);
    setDragOverKey(null);

    const oldStart = new Date(appt.start_time);
    const oldEnd = new Date(appt.end_time);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(target.day || oldStart);
    newStart.setHours(target.hour, target.minutes, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const newStaffId = target.staffId || appt.staff_id;

    // Skip if no actual change
    if (newStart.getTime() === oldStart.getTime() && newStaffId === appt.staff_id) return;

    const { error } = await supabase
      .from("appointments")
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        staff_id: newStaffId,
      })
      .eq("id", appt.id);

    if (error) {
      toast.error("Failed to move appointment");
    } else {
      toast.success("Appointment moved");
      onSuccess();
    }
  };

  return {
    draggingAppt,
    dragOverKey,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  };
}
