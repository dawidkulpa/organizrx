import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { cn } from '../utils'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, X } from 'lucide-react'

interface Invite {
  id: number
  code: string
  date: string | null
  email: string | null
  username: string | null
  dateused: string | null
  usedby: string | null
  ip: string | null
  valid: string | null
  type: string | null
  invitedby: string | null
}

interface InviteTypeConfig {
  reusable: boolean
  expiresInDays: number | null
}

const DEFAULT_INVITE_TYPE_CONFIG: InviteTypeConfig = {
  reusable: false,
  expiresInDays: null,
}

const EXPIRY_OPTIONS: Array<{ label: string; value: string; days: number | null }> = [
  { label: 'Never', value: 'never', days: null },
  { label: '1 day', value: '1', days: 1 },
  { label: '3 days', value: '3', days: 3 },
  { label: '7 days', value: '7', days: 7 },
  { label: '14 days', value: '14', days: 14 },
  { label: '30 days', value: '30', days: 30 },
]

function parseInviteType(type: string | null): InviteTypeConfig {
  if (!type || type === 'user') {
    return DEFAULT_INVITE_TYPE_CONFIG
  }

  try {
    const parsed = JSON.parse(type) as Partial<InviteTypeConfig>

    return {
      reusable: typeof parsed.reusable === 'boolean' ? parsed.reusable : false,
      expiresInDays:
        parsed.expiresInDays === null
          ? null
          : typeof parsed.expiresInDays === 'number' &&
              Number.isInteger(parsed.expiresInDays) &&
              parsed.expiresInDays > 0
            ? parsed.expiresInDays
            : null,
    }
  } catch {
    return DEFAULT_INVITE_TYPE_CONFIG
  }
}

function formatExpiryLabel(expiresInDays: number | null): string {
  if (expiresInDays === null) {
    return 'Never expires'
  }

  return expiresInDays === 1 ? 'Expires in 1 day' : `Expires in ${expiresInDays} days`
}

interface InviteDialogProps {
  open: boolean
  onClose: () => void
}

export default function InviteDialog({ open, onClose }: InviteDialogProps) {
  const queryClient = useQueryClient()
  const [expiresInSelection, setExpiresInSelection] = useState('7')
  const [reusable, setReusable] = useState(false)

  const invitesQuery = useQuery({
    queryKey: queryKeys.invites.all,
    queryFn: () => api.invites.getAll(),
    enabled: open,
    select: (res) => res.data.data || [],
  })

  const generateMutation = useMutation({
    mutationFn: () => {
      const selectedExpiry = EXPIRY_OPTIONS.find((option) => option.value === expiresInSelection)
      return api.invites.create({ expiresInDays: selectedExpiry?.days ?? 7, reusable })
    },
    onSuccess: (res) => {
      toast.success(`Invite generated: ${res.data.data.code}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.all })
    },
    onError: () => toast.error('Failed to generate invite'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.invites.delete(id),
    onSuccess: () => {
      toast.success('Invite deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.all })
    },
    onError: () => toast.error('Failed to delete invite'),
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <h2 className="text-lg font-semibold text-foreground">Manage Invites</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {invitesQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (invitesQuery.data ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active invites found.</div>
          ) : (
            <div className="space-y-3">
              {(invitesQuery.data ?? []).map((invite: Invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-foreground tracking-wider">
                        {invite.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(invite.code)}
                        aria-label="Copy invite code"
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                        title="Copy Code"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created:{' '}
                      {invite.date ? new Date(invite.date).toLocaleDateString() : 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatExpiryLabel(parseInviteType(invite.type).expiresInDays)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {parseInviteType(invite.type).reusable && (
                      <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                        Reusable
                      </span>
                    )}
                    {invite.valid === 'No' && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Used
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this invite?')) {
                          deleteMutation.mutate(invite.id)
                        }
                      }}
                      aria-label="Delete invite"
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-md hover:bg-destructive/10"
                      title="Delete Invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20">
          <div className="space-y-3 mb-4">
            <div className="space-y-1">
              <label htmlFor="invite-expiry" className="text-sm font-medium text-foreground">
                Expires in
              </label>
              <select
                id="invite-expiry"
                value={expiresInSelection}
                onChange={(event) => setExpiresInSelection(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground select-none">
              <input
                type="checkbox"
                checked={reusable}
                onChange={(event) => setReusable(event.target.checked)}
                className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/40"
              />
              Reusable
            </label>
          </div>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className={cn(
              'w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium transition-all hover:brightness-110',
              generateMutation.isPending && 'opacity-70 cursor-wait'
            )}
          >
            {generateMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate New Invite
          </button>
        </div>
      </div>
    </div>
  )
}
