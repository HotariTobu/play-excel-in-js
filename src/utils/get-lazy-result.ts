import type { LazyResult } from "@/types/lazy-result"

export const getLazyResult = <T>(
  initial: boolean,
  data: T | null,
  error: Error | null
): LazyResult<T> => {
  if (initial) {
    return {
      status: "initial",
    }
  }

  if (error === null) {
    if (data === null) {
      return {
        status: "loading",
      }
    }

    return {
      status: "success",
      data,
    }
  }

  return {
    status: "error",
    error,
  }
}
