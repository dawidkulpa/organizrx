import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useTabStore } from '../store'

export default function Tabs() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setActiveTabId = useTabStore((s) => s.setActiveTabId)
  const mountTab = useTabStore((s) => s.mountTab)

  useEffect(() => {
    let cancelled = false

    const tabId = parseInt(id ?? '', 10)
    if (isNaN(tabId)) {
      setActiveTabId(null)
      navigate('/', { replace: true })
      return
    }

    const syncTab = async () => {
      try {
        const res = await api.tabs.getById(tabId)
        const tab = res.data?.data as { id: number; enabled: number | null; type: number | null }

        if (cancelled) return

        const isAccessible = tab.enabled !== 0
        const isExternal = tab.type === 0 || tab.type === null

        if (!isAccessible || !isExternal) {
          setActiveTabId(null)
          navigate('/', { replace: true })
          return
        }

        setActiveTabId(tab.id)
        mountTab(tab.id)
      } catch {
        if (cancelled) return
        setActiveTabId(null)
        navigate('/', { replace: true })
      }
    }

    syncTab()

    return () => {
      cancelled = true
    }
  }, [id, navigate, setActiveTabId, mountTab])

  return null
}
