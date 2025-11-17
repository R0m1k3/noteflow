import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface MobileFABProps {
  icon: LucideIcon;
  onClick: () => void;
  label?: string;
}

export const MobileFAB = ({ icon: Icon, onClick, label }: MobileFABProps) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
};
