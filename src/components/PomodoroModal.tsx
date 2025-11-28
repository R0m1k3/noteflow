import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PomodoroTimer } from "./PomodoroTimer";

interface PomodoroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTimerStateChange?: (isRunning: boolean, timeLeft: number, mode: string) => void;
}

export function PomodoroModal({ open, onOpenChange, onTimerStateChange }: PomodoroModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Pomodoro Timer</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <PomodoroTimer onStateChange={onTimerStateChange} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
