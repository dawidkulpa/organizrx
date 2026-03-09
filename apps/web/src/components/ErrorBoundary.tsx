import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `${error.status} Error`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export default function ErrorBoundary() {
  const error = useRouteError()
  const errorMessage = error ? getErrorMessage(error) : null

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 ring-1 ring-destructive/20">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong!</h1>
        <p className="max-w-[500px] text-muted-foreground md:text-xl">
          We apologize for the inconvenience. Please try again later.
        </p>
        {errorMessage && (
          <div className="mt-4 rounded bg-muted/50 p-4 text-left text-sm font-mono text-muted-foreground max-w-[600px] overflow-auto">
            <pre className="whitespace-pre-wrap break-all">{errorMessage}</pre>
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}
