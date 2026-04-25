import api from "../client";

export const getProjects = async (workspaceId: string) => {
  const res = await api.get("/projects", {
    params: { workspace_id: workspaceId },
  });
  return res.data;
};

export const createProject = async (data: any) => {
  const res = await api.post("/projects", data);
  return res.data;
};