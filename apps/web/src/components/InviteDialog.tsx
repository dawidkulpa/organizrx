import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { cn } from '../utils'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, X } from 'lucide-react'

interface Invite {
  id: number
  code: string
  used: number
  used_by: number | null
  created_date: string
  valid_until: string | null
}

interface InviteDialogProps {
  open: boolean
  onClose: () => void
}

export default function InviteDialog({ open, onClose }: InviteDialogProps) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchInvites = async () => {
    try {
      setLoading(true)
      const res = await api.invites.getAll()
      setInvites(res.data.data || [])
    } catch (error) {
      toast.error('Failed to load invites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchInvites()
    }
  }, [open])

  const generateInvite = async () => {
    try {
      setGenerating(true)
      const res = await api.invites.create({})
      // The API response structure might vary, but typically creates return the created object
      // Assuming res.data.data contains the new invite or similar. 
      // Based on the prompt: "response includes invite code"
      const newInvite = res.data.data
      toast.success(`Invite generated: ${newInvite.code}`)
      fetchInvites()
    } catch (error) {
      toast.error('Failed to generate invite')
    } finally {
      setGenerating(false)
    }
  }

  const deleteInvite = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invite?')) return
    try {
      await api.invites.delete(id)
      toast.success('Invite deleted')
      setInvites(invites.filter((i) => i.id !== id))
    } catch (error) {
      toast.error('Failed to delete invite')
    }
  }

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
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active invites found.
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
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
                        onClick={() => copyToClipboard(invite.code)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                        title="Copy Code"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created: {new Date(invite.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {invite.used === 1 && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Used
                      </span>
                    )}
                    <button
                      onClick={() => deleteInvite(invite.id)}
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
          <button
            onClick={generateInvite}
            disabled={generating}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium transition-all hover:brightness-110",
              generating && "opacity-70 cursor-wait"
            )}
          >
            {generating ? (
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
