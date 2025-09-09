const ignoredKeySet = new Set(["constructor"])

const isNonNullObject = (value: unknown): value is object => {
  return typeof value === "object" && value !== null
}

const prettyDate = (date: Date) => {
  return date.toISOString()
}

const prettyRegExp = (regexp: RegExp) => {
  return regexp.toString()
}

const prettyBytes = (bytes: ArrayBuffer | Uint8Array | Uint16Array | Uint32Array) => {
  return `[Bytes: ${bytes.byteLength}]`
}

const getKeeper = (seen: WeakSet<WeakKey>) => {
  const keep = (value: unknown) => {
    if (!isNonNullObject(value)) {
      return true
    }
    return !seen.has(value)
  }

  return keep
}

const prettyIterable = (iterable: Iterable<unknown>, seen: WeakSet<WeakKey>): unknown[] => {
  const keep = getKeeper(seen)
  return [...iterable].filter(keep).map((value) => prettyCore(value, seen))
}

const getPrettyKeySet = (obj: object): Set<string> => {
  const prototype = Object.getPrototypeOf(obj)
  if (prototype === null) {
    return new Set()
  }

  const keys = getPrettyKeySet(prototype)

  for (const key of Object.getOwnPropertyNames(obj)) {
    if (key.startsWith("_") || ignoredKeySet.has(key)) {
      continue
    }

    keys.add(key)
  }

  return keys
}

const getPrettyValue = (obj: object, key: string): unknown => {
  try {
    const value = (obj as Record<string, unknown>)[key]
    if (typeof value === "function") {
      if (value.length === 0) {
        return () => (obj as Record<string, () => unknown>)[key]?.()
      }
      return `[Function: args(${value.length})]`
    }
    return value
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `[Reflection error: ${message}]`
  }
}

const getPrettyMap = (obj: object): Map<string, unknown> => {
  const map = new Map<string, unknown>()

  for (const key of getPrettyKeySet(obj)) {
    const value = getPrettyValue(obj, key)
    map.set(key, value)
  }

  return map
}

const applyFunctionValue = (value: unknown): [boolean, unknown] => {
  if (typeof value !== "function") {
    return [true, value]
  }

  if (value.length > 0) {
    return [false, null]
  }

  try {
    return [true, value()]
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return [false, `[Function error: ${message}]`]
  }
}

const prettyObject = (obj: object, seen: WeakSet<WeakKey>): Record<string, unknown> => {
  const map = obj instanceof Map ? obj : getPrettyMap(obj)
  const keep = getKeeper(seen)

  const newObj: Record<string, unknown> = {}

  for (const [key, value] of map.entries()) {
    if (!keep(value)) {
      continue
    }

    const [success, newValue] = applyFunctionValue(value)
    if (!success) {
      continue
    }

    newObj[key] = prettyCore(newValue, seen)
  }

  return newObj
}

const prettyCore = (obj: unknown, seen: WeakSet<WeakKey>): unknown => {
  if (!isNonNullObject(obj)) {
    return obj
  }

  seen.add(obj)

  if (obj instanceof Date) {
    return prettyDate(obj)
  }

  if (obj instanceof RegExp) {
    return prettyRegExp(obj)
  }

  if (
    obj instanceof ArrayBuffer ||
    obj instanceof Uint8Array ||
    obj instanceof Uint16Array ||
    obj instanceof Uint32Array
  ) {
    return prettyBytes(obj)
  }

  if (Array.isArray(obj) || obj instanceof Set || obj instanceof Iterator) {
    return prettyIterable(obj, seen)
  }

  return prettyObject(obj, seen)
}

export const pretty = (value: unknown) => {
  const seen = new WeakSet()
  return prettyCore(value, seen)
}
