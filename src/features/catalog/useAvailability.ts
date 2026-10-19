import { useQueries, useQuery } from '@tanstack/react-query'
import { equipmentApi } from '../../api/endpoints'
import { daysBetween } from '../../lib/dates'

export interface DayAvailability {
  date: string
  /** undefined while loading */
  available: number | undefined
}

/**
 * Free units for every day of the range. The API returns only the minimum of a range,
 * so we ask for each day on its own (at most 7 requests, each cached by React Query).
 */
export function useDayAvailability(equipmentId: number, start: string | null, end: string | null) {
  const days = start && end ? daysBetween(start, end) : []

  const results = useQueries({
    queries: days.map((day) => ({
      queryKey: ['availability', equipmentId, day, day],
      queryFn: () => equipmentApi.availability(equipmentId, day, day),
      staleTime: 15_000,
    })),
  })

  const cells: DayAvailability[] = days.map((date, i) => ({ date, available: results[i]?.data?.availableQuantity }))
  const loaded = cells.length > 0 && cells.every((c) => c.available !== undefined)
  const minAvailable = loaded ? Math.min(...cells.map((c) => c.available!)) : undefined

  return {
    cells,
    minAvailable,
    isLoading: cells.length > 0 && !loaded && results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  }
}

/** Free units across the whole range (the lowest day), straight from the API; used by the kit and checkout. */
export function useRangeAvailability(equipmentId: number, start: string | null, end: string | null) {
  return useQuery({
    queryKey: ['availability', equipmentId, start, end],
    queryFn: () => equipmentApi.availability(equipmentId, start!, end!),
    enabled: Boolean(start && end),
    staleTime: 15_000,
  })
}

/**
 * What is still free after the units already in the person's own order. The server only knows about confirmed
 * reservations, so the screen takes the order off by itself; this keeps the numbers moving as items are added.
 */
export function remainingAfterOrder(cells: DayAvailability[], ordered: number) {
  const remainingCells = cells.map((c) => ({ ...c, available: c.available === undefined ? undefined : Math.max(0, c.available - ordered) }))
  const loaded = remainingCells.length > 0 && remainingCells.every((c) => c.available !== undefined)
  const remaining = loaded ? Math.min(...remainingCells.map((c) => c.available!)) : undefined
  return { remainingCells, remaining }
}
