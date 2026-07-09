import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export function ISOBadges({ standards }: { standards?: string[] }) {
  if (!standards || standards.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {standards.map(std => (
        <Badge key={std} variant="outline" className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {std}
        </Badge>
      ))}
    </div>
  );
}
