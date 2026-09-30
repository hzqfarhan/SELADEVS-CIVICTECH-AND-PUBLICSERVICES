import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sources } from "../src/lib/sources";
async function main() {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const labels = {
    runtime: "Connected data and services",
    standard: "Standards and documentation",
    inspiration: "Design and architecture inspiration",
    future: "Researched but not connected",
  };
  let out =
    "# GERAK — complete source, data and API inventory\n\nUpdated: **1 October 2026**. App-readable equivalent: `/sources`; machine-readable equivalent: `GET /api/sources`. This inventory distinguishes actual runtime integrations from research.\n\n";
  for (const kind of Object.keys(labels) as (keyof typeof labels)[]) {
    out += `## ${labels[kind]}\n\n`;
    for (const item of sources.filter((s) => s.kind === kind))
      out += `### [${item.name}](${item.url})\n\n${item.purpose}\n\n${item.notes}\n\n`;
  }
  out +=
    "## Application-owned APIs\n\n| Endpoint | Data |\n| --- | --- |\n| `GET /api/vehicles` | Selected operator vehicle positions; Johor by default; explicit `mode=demo` simulator |\n| `GET /api/network` | Selected operator official topology; UTHM region is a demo topology |\n| `GET /api/events` | Server-Sent Events for positions and report changes |\n| `GET/POST /api/reports` | Public civic records and validated submissions |\n| `PATCH /api/reports/:id` | Authenticated status transitions |\n| `GET/POST/DELETE /api/session` | Operator session state, login and logout |\n| `GET /api/health` | Process/storage selection/feed-cache diagnostics, not database readiness |\n| `GET /api/sources` | This provenance registry |\n| `GET /api/feeds` | Service registry, upstream URLs and update intervals |\n\nFull contracts: [API.md](API.md). These endpoints are implemented by GERAK, not external Malaysian authorities.\n\n";
  out +=
    "## Direct software dependencies\n\nExact transitive dependency versions and integrity hashes are in `package-lock.json`. Licences below come from the installed package manifests. No dependency licence is transferred to unrelated reference-site assets.\n\n| Package | Installed version | Licence | Use |\n| --- | --- | --- | --- |\n";
  for (const [group, dependencies] of Object.entries({
    runtime: pkg.dependencies,
    development: pkg.devDependencies,
  })) {
    for (const name of Object.keys(dependencies as object).sort()) {
      const module = JSON.parse(
        await readFile(path.join("node_modules", name, "package.json"), "utf8"),
      );
      let licence =
        module.license ??
        module.licenses?.map((x: { type: string }) => x.type).join(", ") ??
        "See package";
      if (typeof licence === "object")
        licence = licence.type ?? JSON.stringify(licence);
      out += `| [${name}](https://www.npmjs.com/package/${name}) | ${module.version} | ${licence} | ${group} |\n`;
    }
  }
  out +=
    "\n## Original and unavailable material\n\n- GERAK logo, CSS layout, procedural city, vehicle meshes and simulator are original implementation assets; no Jalan KL or Abeto artwork/models were copied.\n- DM Sans and Space Grotesk are packaged locally through Fontsource; no Google Fonts runtime request remains.\n- The shared ChatGPT conversation could not be fetched; unseen content was not used.\n- `Downloads/codefest26-master.zip` was inspected as an event website source archive, not an authoritative uploaded judging brief. No separate CODEFEST brief was available.\n- The initially attempted CARTO raster URLs returned authorisation-required tiles in visual testing. They were removed from runtime code and replaced with OpenFreeMap. They are not a current dependency.\n- No Mapbox token/API, Google Maps API, external AI API, weather feed, municipal gateway, KATSANA telemetry or paid routing API is configured.\n- Official vehicles, stops and routes are real source data. The 3D buildings are illustrative; generated block placement is not surveyed building or terrain data.\n- The app calculates only bounded route-connection ride-time estimates, not operator ETA, timetable departures, fares, guaranteed accessible journeys or delay predictions.\n";
  await writeFile("docs/SOURCES.md", out);
  console.log(
    `Recorded ${sources.length} source entries and ${Object.keys(pkg.dependencies).length + Object.keys(pkg.devDependencies).length} direct dependencies.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
