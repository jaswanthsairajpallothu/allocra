import { useNotifications, useMarkAllRead } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardSkeleton } from "@/components/states/PageSkeleton";
import { EmptyState, ErrorState } from "@/components/states/StateViews";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const markAll = useMarkAllRead();

  const all = data ?? [];
  const unread = all.filter((n) => !n.is_read);
  const read = all.filter((n) => n.is_read);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Stay on top of changes across your workspaces.
          </p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        )}
      </header>

      {isLoading && <CardSkeleton count={3} />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && all.length === 0 && (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="You're all caught up"
          message="No notifications right now."
        />
      )}

      {unread.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Unread
          </h2>
          {unread.map((n) => (
            <NotifCard key={n.id} n={n} />
          ))}
        </section>
      )}

      {read.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Earlier
          </h2>
          {read.map((n) => (
            <NotifCard key={n.id} n={n} />
          ))}
        </section>
      )}
    </div>
  );
}

function NotifCard({ n }: { n: Notification }) {
  return (
    <Card
      className={`flex gap-3 p-4 transition-colors ${
        !n.is_read ? "border-primary/30 bg-accent/30" : ""
      }`}
    >
      <div className="mt-1">
        <span
          className={`block h-2 w-2 rounded-full ${
            !n.is_read ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{n.title}</div>
        {n.body && (
          <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
        </div>
      </div>
    </Card>
  );
}
