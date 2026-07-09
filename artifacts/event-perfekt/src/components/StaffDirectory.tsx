import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, MapPin } from "lucide-react";
import { formatNigerianPhone } from "@/lib/phone-formatter";

export function StaffDirectory() {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.ok ? res.json() : [];
    },
  });

  const filtered = users.filter((u: any) =>
    !u.role || u.role === 'client' ? false :
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.job_title?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  if (isLoading) {
    return <div className="text-white/60 text-sm">Loading staff directory...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Search by name, role, department, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-white/40">
            {users.length === 0 ? "No staff members" : "No matches found"}
          </div>
        ) : (
          filtered.map((user: any) => {
            const formatted = user.phone ? formatNigerianPhone(user.phone) : null;
            return (
              <Card key={user.id} className="bg-white/10 border-white/10 p-3">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-amber-400">{user.name}</p>
                    {user.job_title && (
                      <p className="text-xs text-white/60">{user.job_title}</p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    {user.phone && formatted && (
                      <a
                        href={`tel:${formatted.tel}`}
                        className="flex items-center gap-2 text-blue-300 hover:text-blue-200"
                        title={`Call ${formatted.display}`}
                      >
                        <Phone className="w-3 h-3" />
                        {formatted.display}
                      </a>
                    )}
                    {user.email && (
                      <a
                        href={`mailto:${user.email}`}
                        className="flex items-center gap-2 text-blue-300 hover:text-blue-200 truncate"
                      >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </a>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-2 text-white/60">
                        <MapPin className="w-3 h-3" />
                        {user.department}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export function StaffContactCard({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.ok ? res.json() : null;
    },
  });

  if (!user) return null;

  const formatted = user.phone ? formatNigerianPhone(user.phone) : null;

  return (
    <div className="bg-white/10 border border-white/10 rounded-lg p-3 space-y-2">
      <div>
        <p className="text-sm font-semibold text-amber-400">{user.name}</p>
        {user.job_title && <p className="text-xs text-white/60">{user.job_title}</p>}
      </div>
      
      <div className="space-y-1 text-xs">
        {formatted && (
          <a
            href={`tel:${formatted.tel}`}
            className="flex items-center gap-2 text-blue-300 hover:text-blue-200"
          >
            <Phone className="w-3 h-3" />
            {formatted.display}
          </a>
        )}
        {user.email && (
          <a
            href={`mailto:${user.email}`}
            className="flex items-center gap-2 text-blue-300 hover:text-blue-200 truncate"
          >
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </a>
        )}
      </div>
    </div>
  );
}
