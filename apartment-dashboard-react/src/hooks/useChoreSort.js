import { useCallback, useState } from 'react'
import { toSortKey } from '../lib/taskStatus'

const STORAGE_KEY = 'choreSort'

const readSortKey = () => {
  try {
    return toSortKey(localStorage.getItem(STORAGE_KEY))
  } catch {
    return toSortKey(null)
  }
}

// The chore list's sort key, remembered per viewer on this device.
export default function useChoreSort() {
  const [sortKey, setSortKeyState] = useState(readSortKey)

  const setSortKey = useCallback((next) => {
    const key = toSortKey(next)
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      // Storage can be unavailable (private mode); the sort still applies for this session.
    }
    setSortKeyState(key)
  }, [])

  return [sortKey, setSortKey]
}
