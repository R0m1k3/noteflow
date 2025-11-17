import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MobileCardProps {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  onClick?: () => void;
}

export const MobileCard = ({
  title,
  icon: Icon,
  children,
  className = "",
  headerAction,
  onClick
}: MobileCardProps) => {
  return (
    <Card
      className={`shadow-sm ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || Icon) && (
        <CardHeader className="pb-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
            </CardTitle>
            {headerAction}
          </div>
        </CardHeader>
      )}
      <CardContent className={`px-4 ${title ? 'py-3' : 'py-4'}`}>
        {children}
      </CardContent>
    </Card>
  );
};
