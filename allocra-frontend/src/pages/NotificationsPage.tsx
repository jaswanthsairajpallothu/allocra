import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  // ✅ replaced useListNotifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
  });

  // ✅ replaced useMarkAllNotificationsRead
  const markAll = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // ✅ replaced useMarkNotificationRead
  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleMarkAll = async () => {
    await markAll.mutateAsync();
  };

  const handleMarkOne = async (id: string) => {
    await markOne.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unread = notifications?.filter((n: any) => !n.is_read) ?? [];
  const read = notifications?.filter((n: any) => n.is_read) ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">{unread.length} unread</p>
        </div>

        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={handleMarkAll}
            disabled={markAll.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {(!notifications || notifications.length === 0) && (
        <EmptyState
          icon={Bell}
          title="All caught up!"
          description="You have no notifications right now."
        />
      )}

      {unread.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">
            Unread
          </p>

          {unread.map((notif: any) => (
            <div
              key={notif.id}
              className="bg-card border border-primary/20 rounded-xl p-4 flex items-start gap-3 hover-elevate cursor-pointer"
              onClick={() => notif.id && handleMarkOne(notif.id)}
            >
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{notif.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notif.created_at
                    ? new Date(notif.created_at).toLocaleString()
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">
            Read
          </p>

          {read.map((notif: any) => (
            <div
              key={notif.id}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 opacity-60"
            >
              <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{notif.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notif.created_at
                    ? new Date(notif.created_at).toLocaleString()
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}