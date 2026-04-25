import api from "../client";

export const getWorkspaces = async () => {
  const res = await api.get("/workspaces");
  return res.data;
};

export const getWorkspace = async (id: string) => {
  const res = await api.get(`/workspaces/${id}`);
  return res.data;
};

export const joinWorkspace = async (code: string) => {
  const res = await api.post("/workspaces/join", { code });
  return res.data;
};