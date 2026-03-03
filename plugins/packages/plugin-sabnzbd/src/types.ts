export interface SabnzbdSlot {
  nzo_id: string
  filename: string
  mb: string
  mbleft: string
  size: string
  sizeleft: string
  percentage: string
  status: string
  timeleft: string
  eta: string
  priority: string
  category: string
}

export interface SabnzbdQueueData {
  queue: {
    status: string
    paused: boolean
    speed: string
    speedlimit: string
    speedlimit_abs: string
    kbpersec: string
    mb: string
    mbleft: string
    sizeleft: string
    noofslots: number
    slots: SabnzbdSlot[]
    timeleft: string
    eta: string
  }
}

export interface SabnzbdHistorySlot {
  nzo_id: string
  name: string
  size: string
  category: string
  status: string
  fail_message: string
  completed: number
  download_time: number
  storage: string
  bytes: number
}

export interface SabnzbdHistoryData {
  history: {
    total_size: string
    slots: SabnzbdHistorySlot[]
  }
}

export interface WidgetProps {
  pluginId: string
  widgetId: string
  settings?: Record<string, unknown>
}

export type TabType = 'queue' | 'history'
