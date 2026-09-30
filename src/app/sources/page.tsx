import Link from "next/link";
import type { Metadata } from "next";
import { sources } from "@/lib/sources";
export const metadata: Metadata = { title: "Sources, data & APIs · GERAK" };
const names = {
  runtime: "Connected data & services",
  standard: "Standards & official documentation",
  inspiration: "Design & architecture inspiration",
  future: "Researched, not connected",
};
export default function SourcesPage() {
  return (
    <main className="sources-page">
      <Link href="/" className="wordmark">
        gerak<span>↗</span>
      </Link>
      <div className="sources-intro">
        <span className="eyebrow">DATA TRANSPARENCY · KETELUSAN DATA</span>
        <h1>Know what moves your map.</h1>
        <p>
          Johor opens with official data. A live feed failure never substitutes
          simulated vehicles. UTHM and the optional Johor demo are explicitly
          labelled simulations.
        </p>
        <p>
          Initial successful integration on 30 September 2026 retrieved 75
          vehicles and imported 21 routes with 988 stops. These are verification
          observations, not promised current fleet counts.
        </p>
      </div>
      {(Object.keys(names) as (keyof typeof names)[]).map((kind) => (
        <section key={kind}>
          <h2>{names[kind]}</h2>
          <div className="source-grid">
            {sources
              .filter((s) => s.kind === kind)
              .map((source) => (
                <article key={source.name}>
                  <a
                    href={source.url}
                    target={
                      source.url.startsWith("http") ? "_blank" : undefined
                    }
                    rel="noreferrer"
                  >
                    {source.name} ↗
                  </a>
                  <p>{source.purpose}</p>
                  <small>{source.notes}</small>
                </article>
              ))}
          </div>
        </section>
      ))}
      <section>
        <h2>What is not claimed</h2>
        <p>
          No official ETA, fare, delay, accessibility audit, current crowd level
          or service-alert data is invented. 3D building footprints come from
          OpenStreetMap; heights may be estimated, and no surveyed terrain is
          claimed. Civic reports remain within GERAK unless a future authority
          integration is agreed. Route connections are not an operational
          timetable.
        </p>
        <p>
          Code dependencies and complete licence references are recorded in{" "}
          <code>package-lock.json</code> and <code>docs/SOURCES.md</code>. No
          paid Mapbox API, Google Maps API, Mapbox terrain service, external AI
          API or analytics tracker is used.
        </p>
      </section>
      <Link href="/" className="primary-button">
        Return to the map
      </Link>
    </main>
  );
}
