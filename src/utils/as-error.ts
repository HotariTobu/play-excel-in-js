export const asError = (error: unknown) => {
  if (error instanceof Error) {
    return error
  }

  const message = String(error)
  return new Error(message)
}
