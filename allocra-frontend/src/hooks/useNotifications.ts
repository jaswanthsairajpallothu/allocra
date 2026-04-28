import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/api/endpoints";
import { safeArray, safeCount, extractError } from "@/api/helpers";
import type { Notification } from "@/types";
import toast from "react-hot-toast";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const res = await notificationApi.list();
      return safeArray<Notification>(res.data);
    },
    refetchInterval: 30_000,
  });
}

/**
 * Returns the unread count as a NUMBER (already unwrapped).
 * Consumers should use the value directly: `count > 0`.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async (): Promise<number> => {
      const res = await notificationApi.unreadCount();
      return safeCount(res.data);
    },
    refetchInterval: 15_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await notificationApi.markAllRead();
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      toast.success("All marked as read");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}
