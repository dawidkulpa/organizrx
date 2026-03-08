import { useEffect } from 'react'
import { api } from '../api/client'
import { useTabPingStore, type TabPingResult } from '../store/tab-ping'

interface PingableTab {
  id: number
  enabled: number | null
  type: number | null
  url: string | null
  url_local?: string | null
}

interface CachedPingResult {
  expiresAt: number
  result: TabPingResult
}

const PING_INTERVAL_MS = 60_000
const RESULT_CACHE_TTL_MS = 5 * 60 * 1000
const pingCache = new Map<string, CachedPingResult>()
const inFlightChecks = new Map<string, Promise<TabPingResult>>()

function isEligibleForPing(tab: PingableTab): tab is PingableTab & { url: string } {
  return tab.enabled !== 0 && (tab.type === 0 || tab.type === null) && Boolean(tab.url)
}

function getCached(url: string): TabPingResult | null {
  const cached = pingCache.get(url)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    pingCache.delete(url)
    return null
  }

  return cached.result
}

function setCached(url: string, result: TabPingResult): void {
  pingCache.set(url, {
    expiresAt: Date.now() + RESULT_CACHE_TTL_MS,
    result,
  })
}

async function checkUrl(url: string): Promise<TabPingResult> {
  const cached = getCached(url)
  if (cached) {
    return cached
  }

  const currentInFlight = inFlightChecks.get(url)
  if (currentInFlight) {
    return currentInFlight
  }

  const request = api.tabs
    .checkUrl(url)
    .then((res: { data: { reachable: boolean; iframeAllowed: boolean; status: number } }) => {
      const payload = res.data as { reachable: boolean; iframeAllowed: boolean; status: number }
      const result: TabPingResult = {
        reachable: payload.reachable,
        iframeAllowed: payload.iframeAllowed,
        status: payload.status,
        checkedAt: Date.now(),
      }
      setCached(url, result)
      return result
    })
    .catch(() => {
      const result: TabPingResult = {
        reachable: false,
        iframeAllowed: false,
        status: 0,
        checkedAt: Date.now(),
      }
      setCached(url, result)
      return result
    })
    .finally(() => {
      inFlightChecks.delete(url)
    })

  inFlightChecks.set(url, request)
  return request
}

export function useTabPing(tabs: PingableTab[]) {
  const setResult = useTabPingStore((state) => state.setResult)

  useEffect(() => {
    let isMounted = true

    const pingTabs = async () => {
      const eligibleTabs = tabs.filter(isEligibleForPing)
      await Promise.all(
        eligibleTabs.map(async (tab) => {
          const targetUrl = tab.url_local ?? tab.url
          if (!targetUrl) {
            return
          }

          const result = await checkUrl(targetUrl)
          if (!isMounted) {
            return
          }

          setResult(tab.id, result)
        })
      )
    }

    void pingTabs()
    const intervalId = setInterval(() => {
      void pingTabs()
    }, PING_INTERVAL_MS)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [tabs, setResult])
}
