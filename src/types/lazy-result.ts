export type LazyResult<T> =
  | {
      status: "initial"
    }
  | {
      status: "loading"
    }
  | {
      status: "success"
      data: T
    }
  | {
      status: "error"
      error: Error
    }
