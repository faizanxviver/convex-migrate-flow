import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-7xl font-black text-gradient sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/" className="btn-glass btn-glass-primary flex h-11 items-center px-6 text-sm font-bold">
            Back to home
          </Link>
          <Link to="/dashboard" className="btn-glass flex h-11 items-center px-6 text-sm font-bold text-foreground">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
