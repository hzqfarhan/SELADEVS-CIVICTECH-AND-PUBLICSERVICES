"use client";

import type { Locale } from "@/lib/types";
import styles from "./report-demo.module.css";

const scenarios = [
  {
    title: ["Blocked boarding area", "Ruang menaiki bas terhalang"],
    place: ["Example stop · Town centre", "Hentian contoh · Pusat bandar"],
    detail: [
      "A parked motorcycle blocks the ramp to the bus stop.",
      "Motosikal yang diparkir menghalang tanjakan ke hentian bas.",
    ],
    team: ["Stop access team", "Pasukan akses hentian"],
    response: [
      "The access team has accepted the report and scheduled an inspection.",
      "Pasukan akses telah menerima laporan dan menjadualkan pemeriksaan.",
    ],
    action: [
      "The team is checking the ramp and arranging clearance.",
      "Pasukan sedang memeriksa tanjakan dan menguruskan pengalihan halangan.",
    ],
    resolution: [
      "The obstruction has been removed and the boarding path checked.",
      "Halangan telah dialihkan dan laluan menaiki bas telah diperiksa.",
    ],
  },
  {
    title: ["Damaged bus shelter", "Pondok bas rosak"],
    place: [
      "Example stop · Community clinic",
      "Hentian contoh · Klinik komuniti",
    ],
    detail: [
      "A damaged roof leaves waiting passengers exposed to rain.",
      "Bumbung rosak menyebabkan penumpang yang menunggu terdedah kepada hujan.",
    ],
    team: ["Shelter maintenance team", "Pasukan penyelenggaraan pondok"],
    response: [
      "Maintenance has reviewed the report and assigned a site visit.",
      "Pasukan penyelenggaraan telah menyemak laporan dan menetapkan lawatan tapak.",
    ],
    action: [
      "The damaged section is being inspected for repair.",
      "Bahagian yang rosak sedang diperiksa untuk dibaiki.",
    ],
    resolution: [
      "The roof panel has been replaced and the waiting area checked.",
      "Panel bumbung telah diganti dan ruang menunggu telah diperiksa.",
    ],
  },
];

export function ReportDemo({
  locale,
  scenario,
  stage,
  onScenario,
  onStage,
}: {
  locale: Locale;
  scenario: number;
  stage: number;
  onScenario: (value: number) => void;
  onStage: (value: number) => void;
}) {
  const copy = (pair: readonly string[]) => pair[locale === "ms" ? 1 : 0];
  const item = scenarios[scenario];
  const labels = [
    ["Submitted", "Dihantar"],
    ["Acknowledged", "Diterima"],
    ["In progress", "Dalam tindakan"],
    ["Resolved", "Selesai"],
  ];
  const notes = [item.detail, item.response, item.action, item.resolution];
  return (
    <section
      className={styles.panel}
      aria-label={copy(["Reporting demonstration", "Demonstrasi pelaporan"])}
    >
      <div className={styles.heading}>
        <span className={styles.badge}>
          {copy(["INTERACTIVE DEMO", "DEMO INTERAKTIF"])}
        </span>
        <span className={styles.reference}>DEMO-00{scenario + 1}</span>
      </div>
      <h3>
        {copy([
          "A report. A response. A better journey.",
          "Laporan. Tindakan. Perjalanan lebih baik.",
        ])}
      </h3>
      <p className={styles.disclaimer}>
        {copy([
          "Fictional examples with scripted responses. No report is sent to an authority.",
          "Contoh rekaan dengan respons yang ditetapkan. Tiada laporan dihantar kepada pihak berkuasa.",
        ])}
      </p>
      <label className={styles.label}>
        {copy(["Choose a scenario", "Pilih senario"])}
        <select
          value={scenario}
          onChange={(event) => onScenario(Number(event.target.value))}
        >
          {scenarios.map((entry, index) => (
            <option key={index} value={index}>
              {copy(entry.title)}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.context}>
        <strong>{copy(item.title)}</strong>
        <span>{copy(item.place)}</span>
        <span>
          {copy(["Responsible team", "Pasukan bertanggungjawab"])}:{" "}
          {copy(item.team)}
        </span>
      </div>
      <ol
        className={styles.timeline}
        aria-label={copy([
          "Example response timeline",
          "Garis masa respons contoh",
        ])}
      >
        {labels.map((label, index) => (
          <li
            key={index}
            className={index <= stage ? styles.reached : styles.pending}
            aria-current={index === stage ? "step" : undefined}
          >
            <span className={styles.dot}>
              {index < stage ? "✓" : index + 1}
            </span>
            <div>
              <strong>{copy(label)}</strong>
              {index <= stage && <p>{copy(notes[index])}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.status} role="status">
        {copy(["Demo status", "Status demo"])}: {copy(labels[stage])}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onStage(0)}
          disabled={stage === 0}
        >
          {copy(["Reset", "Set semula"])}
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => onStage(Math.min(3, stage + 1))}
          disabled={stage === 3}
        >
          {stage === 3
            ? copy(["Demo complete", "Demo selesai"])
            : `${copy(["Simulate", "Simulasikan"])}: ${copy(labels[stage + 1])}`}
        </button>
      </div>
    </section>
  );
}
