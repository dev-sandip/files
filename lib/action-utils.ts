import "server-only";

export function normalizeActionError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return new Error((e as { message: string }).message);
  }
  return new Error("Request failed");
}
