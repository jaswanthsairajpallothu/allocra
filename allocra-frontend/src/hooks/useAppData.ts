import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";

// ✅ GET /auth/me
export const useGetMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
  });
};

// ✅ GET /workspaces
export const useListWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get("/workspaces");
      return res.data;
    },
  });
};

// ✅ GET /projects?workspace_id=
export const useListProjects = (params: { workspace_id: string }) => {
  return useQuery({
    queryKey: ["projects", params.workspace_id],
    queryFn: async () => {
      if (!params.workspace_id) return [];
      const res = await api.get("/projects", {
        params,
      });
      return res.data;
    },
    enabled: !!params.workspace_id,
  });
};

// ✅ GET /notifications/unread-count
export const useGetUnreadCount = () => {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count");
      return res.data;
    },
    refetchInterval: 10000,
  });
};