import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-reveal">
      <div className="text-center space-y-6">
        <h1 className="text-9xl font-black text-primary/10 tracking-tighter select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          404
        </h1>
        <h2 className="text-3xl font-bold tracking-tight relative z-10">Page not found</h2>
        <p className="text-muted-foreground max-w-[500px] mx-auto relative z-10">
          Sorry, we couldn’t find the page you’re looking for. It might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6 relative z-10">
          <Link
            to="/"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 transform hover:scale-[1.02]"
          >
            Go back home
          </Link>
          <a href="#" className="text-sm font-semibold leading-6 text-foreground hover:underline">
            Contact support <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
