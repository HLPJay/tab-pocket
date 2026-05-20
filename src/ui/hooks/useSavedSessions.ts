import { useState, useCallback } from 'react'
import type { SavedSession } from '../../domain/sessionTypes'
import { listSavedSessions, softDeleteSavedSession } from '../../repositories/storageRepository'
import { captureBrowserTabsAsSession } from '../../services/sessionCaptureService'
import type { SessionTabInput } from '../../services/sessionCaptureService'

export type UseSavedSessionsResult = {
  savedSessions: SavedSession[]
  loadingSessions: boolean
  sessionError: string | null
  loadSavedSessions: () => Promise<void>
  captureCurrentWindowAsSession: (inputs: SessionTabInput[], name?: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
}

export function useSavedSessions(): UseSavedSessionsResult {
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const loadSavedSessions = useCallback(async () => {
    setLoadingSessions(true)
    setSessionError(null)
    try {
      setSavedSessions(await listSavedSessions())
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : '读取 Session 数据失败。')
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const captureCurrentWindowAsSession = useCallback(
    async (inputs: SessionTabInput[], name?: string) => {
      await captureBrowserTabsAsSession(inputs, { name })
      await loadSavedSessions()
    },
    [loadSavedSessions]
  )

  const deleteSession = useCallback(
    async (id: string) => {
      await softDeleteSavedSession(id)
      await loadSavedSessions()
    },
    [loadSavedSessions]
  )

  return {
    savedSessions,
    loadingSessions,
    sessionError,
    loadSavedSessions,
    captureCurrentWindowAsSession,
    deleteSession,
  }
}
