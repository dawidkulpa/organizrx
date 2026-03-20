import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { useTabStore } from '../store'

export default function Tabs() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setActiveTabId = useTabStore((s) => s.setActiveTabId)
  const mountTab = useTabStore((s) => s.mountTab)

  // Parse tabId before query for use in queryKey and enabled condition
  const tabId = parseInt(id ?? '', 10)

  const query = useQuery({
    queryKey: queryKeys.tabs.detail(tabId),
    queryFn: () => api.tabs.getById(tabId),
    enabled: !isNaN(tabId),
  })

  // Handle navigation side-effects when query completes
  useEffect(() => {
    // Invalid tabId: redirect home
    if (isNaN(tabId)) {
      setActiveTabId(null)
      navigate('/', { replace: true })
      return
    }

    // Query error: redirect home
    if (query.isError) {
      setActiveTabId(null)
      navigate('/', { replace: true })
      return
    }

    // Query success: validate tab and handle navigation/mounting
    if (query.data) {
      const tab = query.data.data.data as {
        id: number
        enabled: number | null
        type: number | null
      }

      const isAccessible = tab.enabled !== 0
      const isExternal = tab.type === 0 || tab.type === null

      if (!isAccessible || !isExternal) {
        setActiveTabId(null)
        navigate('/', { replace: true })
        return
      }

      setActiveTabId(tab.id)
      mountTab(tab.id)
    }
  }, [query.data, query.isError, tabId, navigate, setActiveTabId, mountTab])

  return null
}
