import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="wordmark">
        gerak<span>↗</span>
      </span>
      <h1>A little off route.</h1>
      <p>That page isn’t on this network.</p>
      <Link href="/" className="primary-button">
        Back to the live map
      </Link>
    </main>
  );
}
