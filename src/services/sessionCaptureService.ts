import type { BrowserTab } from '../domain/browserTabTypes'
import type { SavedSession } from '../domain/sessionTypes'
import { isCollectibleUrl } from './urlFilterService'
import { captureBrowserTab } from './tabCaptureService'
import { upsertSavedSession } from '../repositories/storageRepository'

export type SessionTabInput = {
  tab: BrowserTab
  note?: string
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function defaultSessionName(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return `当前窗口 ${date} ${time}`
}

export async function captureBrowserTabsAsSession(
  inputs: SessionTabInput[],
  options?: { name?: string }
): Promise<SavedSession> {
  const collectible = inputs.filter(
    ({ tab }) => tab.id !== undefined && !!tab.url && isCollectibleUrl(tab.url)
  )

  if (collectible.length === 0) {
    throw new Error('没有可收纳的网页')
  }

  const sessionId = generateId()
  const seenIds = new Set<string>()
  const tabIds: string[] = []

  for (const { tab, note } of collectible) {
    const saved = await captureBrowserTab(tab, { note, sessionId })
    if (!seenIds.has(saved.id)) {
      seenIds.add(saved.id)
      tabIds.push(saved.id)
    }
  }

  const now = Date.now()
  const session: SavedSession = {
    id: sessionId,
    name: options?.name ?? defaultSessionName(),
    tabIds,
    capturedAt: now,
    updatedAt: now,
    status: 'active',
  }

  await upsertSavedSession(session)
  return session
}
