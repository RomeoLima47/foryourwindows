import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
      <p className="mb-4 text-6xl">🔍</p>
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-6 text-muted-foreground">This page doesn&apos;t exist or has been moved.</p>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
