import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { allocationApi } from "@/api/endpoints";
import { safeArray, extractError } from "@/api/helpers";
import { useAllocationStore } from "@/stores/allocation";
import type { AllocationHistoryItem } from "@/types";
import toast from "react-hot-toast";

export function useRunAllocation(projectId: string) {
  const qc = useQueryClient();
  const setResult = useAllocationStore((s) => s.setResult);
  return useMutation({
    mutationFn: async () => {
      const res = await allocationApi.run(projectId);
      return res.data;
    },
    onSuccess: (result) => {
      setResult(result);
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["team-load", projectId] });
      toast.success(`Allocated ${result.assigned}/${result.total_tasks} tasks`);
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useAllocationHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ["allocation-history", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<AllocationHistoryItem[]> => {
      const res = await allocationApi.history(projectId!);
      return safeArray<AllocationHistoryItem>(res.data);
    },
  });
}
