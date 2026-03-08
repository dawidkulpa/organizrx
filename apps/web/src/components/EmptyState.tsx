interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
