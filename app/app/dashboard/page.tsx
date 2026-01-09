import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome to Otimizator</p>

      <div className="mt-8">
        <Link
          href="/app/trips"
          className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Create New Trip
        </Link>
      </div>
    </div>
  )
}
