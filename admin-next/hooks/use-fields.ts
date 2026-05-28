"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { FieldDescriptor, FieldsResponse } from "@/lib/types"

/**
 * Shared `/fields` query. Both the leads page and FilterBuilder read from the
 * same cache key so we only pay for the request once per session window.
 */
export function useFieldsQuery() {
  return useQuery<FieldsResponse>({
    queryKey: ["fields"],
    queryFn: () => api.fields(),
    staleTime: 60_000,
    retry: false,
  })
}

/**
 * Flattened convenience hook — returns every field descriptor (columns +
 * dynamic) as a single array, plus pending/error flags. Used wherever a
 * caller doesn't care about the columns/dynamic split.
 */
export function useFields() {
  const q = useFieldsQuery()
  const fields = useMemo<FieldDescriptor[]>(() => {
    if (!q.data) return []
    return [
      ...(q.data.columns ?? []),
      ...(q.data.dynamic ?? []),
      ...(q.data.data_fields ?? []),
    ]
  }, [q.data])
  return {
    fields,
    isPending: q.isPending,
    isError: q.isError,
    error: q.error,
  }
}
