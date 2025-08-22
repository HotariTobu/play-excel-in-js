import { useCallback, useState } from "react"
import type { LazyResult } from "@/types/lazy-result"
import { getLazyResult } from "@/utils/get-lazy-result"

type HandleLoading = () => void
type HandleSuccess<T> = (data: T) => void
type HandleError = (error: Error) => void
type HandleReset = () => void

type Handlers<T> = {
  handleLoading: HandleLoading
  handleSuccess: HandleSuccess<T>
  handleError: HandleError
  handleReset: HandleReset
}

export const useLazyResult = <T>(params?: {
  initialData?: T | null
  initialError?: Error | null
}): [LazyResult<T>, Handlers<T>] => {
  const initialData = params?.initialData ?? null
  const initialError = params?.initialError ?? null

  const [initial, setInitial] = useState(true)
  const [data, setData] = useState<T | null>(initialData)
  const [error, setError] = useState<Error | null>(initialError)

  const result: LazyResult<T> = getLazyResult(initial, data, error)

  const handleLoading: HandleLoading = useCallback(() => {
    setInitial(false)
    setData(null)
    setError(null)
  }, [])

  const handleSuccess: HandleSuccess<T> = useCallback((data) => {
    setInitial(false)
    setData(data)
    setError(null)
  }, [])

  const handleError: HandleError = useCallback((error) => {
    setInitial(false)
    setData(null)
    setError(error)
  }, [])

  const handleReset: HandleReset = useCallback(() => {
    setInitial(true)
    setData(initialData)
    setError(initialError)
  }, [initialData, initialError])

  return [result, { handleLoading, handleSuccess, handleError, handleReset }]
}
