import { useState, useCallback } from 'react'
import type { SavedSession } from '../../domain/sessionTypes'
import { listSavedSessions, softDeleteSavedSession } from '../../repositories/storageRepository'
import { captureBrowserTabsAsSession } from '../../services/sessionCaptureService'
import type { SessionTabInput } from '../../services/sessionCaptureService'
import { captureBrowserTabsAsSessionAndClose } from '../../services/sessionCaptureAndCloseService'
import type { SessionCaptureAndCloseResult } from '../../services/sessionCaptureAndCloseService'
import { openSessionTabs } from '../../services/sessionOpenService'

export type UseSavedSessionsResult = {
  savedSessions: SavedSession[]
  loadingSessions: boolean
  sessionError: string | null
  loadSavedSessions: () => Promise<void>
  captureCurrentWindowAsSession: (inputs: SessionTabInput[], name?: string) => Promise<void>
  captureCurrentWindowAsSessionAndClose: (inputs: SessionTabInput[], name?: string) => Promise<SessionCaptureAndCloseResult>
  openSession: (sessionId: string) => Promise<void>
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

  const captureCurrentWindowAsSessionAndClose = useCallback(
    async (inputs: SessionTabInput[], name?: string): Promise<SessionCaptureAndCloseResult> => {
      const result = await captureBrowserTabsAsSessionAndClose(inputs, { name })
      await loadSavedSessions()
      return result
    },
    [loadSavedSessions]
  )

  const openSession = useCallback(
    async (sessionId: string) => {
      await openSessionTabs(sessionId)
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
    captureCurrentWindowAsSessionAndClose,
    openSession,
    deleteSession,
  }
}
