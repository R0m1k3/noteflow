import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title: string;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const MobileHeader = ({
  title,
  onMenuClick,
  onBackClick,
  showBack = false,
  rightAction
}: MobileHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackClick}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        <h1 className="text-lg font-semibold truncate flex-1 text-center">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          {rightAction || <div className="w-9" />}
        </div>
      </div>
    </header>
  );
};
