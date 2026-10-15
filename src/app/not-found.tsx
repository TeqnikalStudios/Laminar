import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="flow-text text-6xl font-semibold">404</p>
      <p className="mt-3 text-muted">That page doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 rounded-lg border border-line px-4 py-2 text-sm hover:border-line-strong">
        Back to overview
      </Link>
    </div>
  );
}
