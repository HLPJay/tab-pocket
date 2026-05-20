import type { SavedSession } from '../domain/sessionTypes'
import type { SessionTabInput } from './sessionCaptureService'
import { captureBrowserTabsAsSession } from './sessionCaptureService'
import { closeTab } from '../chrome/chromeTabsClient'

export type SessionCaptureAndCloseResult = {
  session: SavedSession
  closeWarning?: string
}

export async function captureBrowserTabsAsSessionAndClose(
  inputs: SessionTabInput[],
  options?: { name?: string }
): Promise<SessionCaptureAndCloseResult> {
  // Save first — NEVER close before save succeeds
  const session = await captureBrowserTabsAsSession(inputs, options)

  // Close selected, non-pinned tabs after save
  const toClose = inputs.filter(({ tab }) => !tab.pinned && !!tab.id)

  const failedCount = { count: 0 }
  for (const { tab } of toClose) {
    try {
      await closeTab(tab.id)
    } catch {
      failedCount.count++
    }
  }

  if (failedCount.count > 0) {
    return {
      session,
      closeWarning: `已收纳成功，但 ${failedCount.count} 个标签页关闭失败，请手动关闭。`,
    }
  }

  return { session }
}
