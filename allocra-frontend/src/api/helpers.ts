// Mandatory safety utilities — never call .map()/.filter() directly on API data.

export const safeArray = <T,>(data: unknown): T[] =>
  Array.isArray(data) ? (data as T[]) : [];

export const safeCount = (data: unknown): number => {
  if (typeof data === "number") return data;
  if (data && typeof (data as { count?: unknown }).count === "number") {
    return (data as { count: number }).count;
  }
  return 0;
};

export const extractError = (error: unknown): string => {
  const e = error as {
    response?: { data?: { detail?: unknown } };
    message?: string;
  };
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (
    detail &&
    typeof detail === "object" &&
    typeof (detail as { message?: string }).message === "string"
  ) {
    return (detail as { message: string }).message;
  }
  return e?.message || "Something went wrong";
};
