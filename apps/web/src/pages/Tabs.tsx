import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import TabContent, { type TabData } from '../components/TabContent'

export default function Tabs() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTab = useCallback(async (tabId: number) => {
    setIsLoading(true)
    try {
      const res = await api.tabs.getById(tabId)
      setTab(res.data.data)
    } catch {
      setTab(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const tabId = parseInt(id ?? '', 10)
    if (isNaN(tabId)) {
      setTab(null)
      setIsLoading(false)
      return
    }
    fetchTab(tabId)
  }, [id, fetchTab])

  return (
    <div className="h-full -m-6">
      <TabContent tab={tab} isLoading={isLoading} />
    </div>
  )
}
