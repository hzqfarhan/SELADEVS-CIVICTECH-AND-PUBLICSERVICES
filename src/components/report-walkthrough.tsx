"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  Inbox,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/types";
import {
  advanceWalkthrough,
  createWalkthrough,
  parseWalkthrough,
  stageLabels,
  submitWalkthrough,
  WALKTHROUGH_STORAGE_KEY,
  walkthroughScenarios,
  type WalkthroughState,
  type WalkthroughView,
} from "@/lib/report-walkthrough";
import styles from "./report-walkthrough.module.css";

export function ReportWalkthrough({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<WalkthroughState>(() =>
    createWalkthrough(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState("");
  const copy = (en: string, ms: string) => (locale === "ms" ? ms : en);
  const scenario =
    walkthroughScenarios.find((item) => item.id === state.scenarioId) ??
    walkthroughScenarios[0];
  const labels =
    locale === "ms"
      ? ["Draf", "Dihantar", "Diterima", "Dalam tindakan", "Selesai"]
      : stageLabels;

  useEffect(() => {
    const active = document.activeElement;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    if (element && !element.open) element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (active instanceof HTMLElement) active.focus();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
      if (stored) setState(parseWalkthrough(JSON.parse(stored)));
    } catch {
      // The sample remains interactive when browser storage is unavailable.
    }
    setHydrated(true);
    const receive = (event: StorageEvent) => {
      if (event.key !== WALKTHROUGH_STORAGE_KEY) return;
      try {
        setState(
          event.newValue
            ? parseWalkthrough(JSON.parse(event.newValue))
            : createWalkthrough(),
        );
      } catch {
        // Ignore malformed changes from another tab.
      }
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // State still works for this open walkthrough.
    }
  }, [hydrated, state]);

  function update(patch: Partial<WalkthroughState>) {
    setState((current) => ({ ...current, ...patch }));
    setNotice("");
  }

  function capture() {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(true);
    update({ photoAttached: true });
    setNotice(copy("Example photo attached.", "Foto contoh dilampirkan."));
    flashTimer.current = setTimeout(() => setFlash(false), 450);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setState(submitWalkthrough(state));
      setNotice(
        copy(
          "Demo report submitted. Open the operator inbox to respond.",
          "Laporan demo dihantar. Buka peti masuk operator untuk memberi respons.",
        ),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Check report details.",
      );
    }
  }

  function advance() {
    try {
      const next = advanceWalkthrough(state);
      setState(next);
      setNotice(
        `${copy("Report updated", "Laporan dikemas kini")}: ${labels[next.stage]}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Submit a report first.",
      );
    }
  }

  function reset(scenarioId = state.scenarioId) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setState(createWalkthrough(scenarioId));
    setFlash(false);
    setNotice(copy("Ready for a fresh take.", "Sedia untuk rakaman baharu."));
  }

  const tabs: {
    id: WalkthroughView;
    label: string;
    hint: string;
    icon: typeof Camera;
  }[] = [
    {
      id: "resident",
      label: copy("Resident report", "Laporan penduduk"),
      hint: "24 s",
      icon: Camera,
    },
    {
      id: "operator",
      label: copy("Operator inbox", "Peti masuk operator"),
      hint: "14 s",
      icon: Inbox,
    },
    {
      id: "passenger",
      label: copy("Passenger update", "Kemas kini penumpang"),
      hint: "8 s",
      icon: Bell,
    },
  ];

  function timeline() {
    return (
      <ol
        className={styles.timeline}
        aria-label={copy("Report progress", "Kemajuan laporan")}
      >
        {labels.slice(1).map((label, index) => (
          <li
            key={index}
            className={state.stage > index ? styles.reached : ""}
            aria-current={state.stage === index + 1 ? "step" : undefined}
          >
            <span>{state.stage > index ? <Check size={14} /> : index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
    );
  }

  function photo(className = "") {
    return (
      <div className={`${styles.photo} ${className}`}>
        {/* Original, local artwork used as a fictional demonstration attachment. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scenario.photo}
          alt={`${scenario.label} — ${copy("sample scene", "adegan contoh")}`}
        />
        <span className={styles.photoLabel}>
          <Camera size={13} /> {copy("SAMPLE PHOTO", "FOTO CONTOH")}
        </span>
      </div>
    );
  }

  function locationCard() {
    return (
      <div className={styles.locationCard}>
        <div className={styles.miniMap} aria-hidden="true">
          <i />
          <i />
          <i />
          <span>
            <MapPin size={23} fill="currentColor" />
          </span>
        </div>
        <div>
          <small>{copy("REPORT LOCATION", "LOKASI LAPORAN")}</small>
          <strong>{state.location}</strong>
          <span>{scenario.coordinate.join(", ")}</span>
        </div>
      </div>
    );
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="walkthrough-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <Sparkles size={14} /> {copy("INTERACTIVE DEMO", "DEMO INTERAKTIF")}
          </span>
          <h2 id="walkthrough-title">
            {copy("From street to solution.", "Dari jalan ke penyelesaian.")}
          </h2>
          <p>
            {copy(
              "One report. A visible response. A better journey.",
              "Satu laporan. Respons yang jelas. Perjalanan lebih baik.",
            )}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.reset}
            onClick={() => reset()}
          >
            <RotateCcw size={16} />
            {copy("Reset take", "Set semula")}
          </button>
          <button
            type="button"
            className={styles.close}
            aria-label={copy("Close walkthrough", "Tutup panduan demo")}
            onClick={onClose}
          >
            <X size={23} />
          </button>
        </div>
      </header>

      <nav
        className={styles.tabs}
        aria-label={copy("Demo views", "Paparan demo")}
      >
        {tabs.map((tab, index) => (
          <button
            type="button"
            key={tab.id}
            className={state.view === tab.id ? styles.activeTab : ""}
            aria-current={state.view === tab.id ? "page" : undefined}
            disabled={!hydrated || (tab.id !== "resident" && state.stage === 0)}
            onClick={() => update({ view: tab.id })}
          >
            <span className={styles.tabNumber}>{index + 1}</span>
            <tab.icon size={18} />
            <strong>{tab.label}</strong>
            <small>{tab.hint}</small>
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        <div className={styles.meta}>
          <span>
            <CircleDot size={14} /> {state.reportId} <i />{" "}
            {copy("Sample report", "Laporan contoh")}
          </span>
          <span
            className={`${styles.status} ${state.stage === 4 ? styles.resolved : ""}`}
          >
            {state.stage > 0 && <CheckCircle2 size={14} />}
            {labels[state.stage]}
          </span>
        </div>

        {state.view === "resident" && (
          <div className={styles.residentGrid}>
            <section>
              <div className={styles.sectionHeading}>
                <span className={styles.iconTile}>
                  <Camera size={21} />
                </span>
                <div>
                  <h3>
                    {copy(
                      "Make the issue visible.",
                      "Jadikan isu lebih jelas.",
                    )}
                  </h3>
                  <p>
                    {copy(
                      "Capture it. Add context. Send your report.",
                      "Ambil foto. Tambah maklumat. Hantar laporan.",
                    )}
                  </p>
                </div>
              </div>
              <form className={styles.form} onSubmit={submit}>
                <label>
                  {copy("Choose a street issue", "Pilih isu jalan")}
                  <select
                    value={state.scenarioId}
                    onChange={(event) => reset(event.target.value)}
                  >
                    {walkthroughScenarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {copy("Report title", "Tajuk laporan")}
                  <input
                    required
                    maxLength={120}
                    value={state.title}
                    disabled={state.stage > 0}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                <div className={styles.formRow}>
                  <label>
                    {copy("Category", "Kategori")}
                    <input value={scenario.category} readOnly />
                  </label>
                  <label>
                    {copy("Location", "Lokasi")}
                    <input
                      required
                      maxLength={180}
                      value={state.location}
                      disabled={state.stage > 0}
                      onChange={(event) =>
                        update({ location: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  {copy(
                    "What needs attention?",
                    "Apakah isu yang memerlukan perhatian?",
                  )}
                  <textarea
                    required
                    maxLength={1200}
                    rows={3}
                    value={state.description}
                    disabled={state.stage > 0}
                    onChange={(event) =>
                      update({ description: event.target.value })
                    }
                  />
                </label>
                {state.stage === 0 ? (
                  <button
                    className={styles.primary}
                    type="submit"
                    disabled={!hydrated || !state.photoAttached}
                  >
                    <Send size={17} />
                    {copy("Submit demo report", "Hantar laporan demo")}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className={styles.primary}
                    type="button"
                    onClick={() => update({ view: "operator" })}
                  >
                    <CheckCircle2 size={18} />
                    {copy(
                      "Report sent · open operator inbox",
                      "Laporan dihantar · buka peti masuk",
                    )}
                    <ArrowRight size={17} />
                  </button>
                )}
              </form>
            </section>
            <aside className={styles.captureColumn}>
              <div
                className={`${styles.capture} ${flash ? styles.flashing : ""}`}
              >
                {photo()}
                <div className={styles.viewfinder} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <i />
                </div>
                <span className={styles.cameraText}>
                  {state.photoAttached
                    ? copy("PHOTO ATTACHED", "FOTO DILAMPIRKAN")
                    : copy("FRAME THE ISSUE", "BINGKAIKAN ISU")}
                </span>
                {state.photoAttached && (
                  <span className={styles.attached}>
                    <Check size={16} />
                  </span>
                )}
              </div>
              <button
                type="button"
                className={styles.captureButton}
                onClick={capture}
                disabled={state.stage > 0}
              >
                <Camera size={19} />
                {state.photoAttached
                  ? copy("Retake example photo", "Ambil semula foto contoh")
                  : copy("Snap example photo", "Ambil foto contoh")}
              </button>
              {locationCard()}
              <p className={styles.contextNote}>
                <MapPin size={14} />
                {copy(
                  "Photo + location + details give the operator context.",
                  "Foto + lokasi + butiran membantu operator memahami isu.",
                )}
              </p>
            </aside>
          </div>
        )}

        {state.view === "operator" && (
          <div className={styles.operatorGrid}>
            <aside className={styles.inbox}>
              <div className={styles.inboxHeading}>
                <Inbox size={19} />
                <h3>{copy("Report inbox", "Peti masuk laporan")}</h3>
                <span>{state.stage > 0 ? 1 : 0}</span>
              </div>
              {state.stage > 0 ? (
                <div className={styles.inboxItem}>
                  <span className={styles.inboxTag}>{scenario.category}</span>
                  <strong>{state.title}</strong>
                  <span>
                    <MapPin size={13} />
                    {state.location}
                  </span>
                  <small>{state.reportId}</small>
                  <span className={styles.inboxSelected}>
                    {copy("Selected report", "Laporan dipilih")}
                    <ArrowRight size={14} />
                  </span>
                </div>
              ) : (
                <div className={styles.inboxEmpty}>
                  <ClipboardList size={32} />
                  <strong>
                    {copy(
                      "Ready for your first report",
                      "Sedia untuk laporan pertama",
                    )}
                  </strong>
                  <p>
                    {copy(
                      "Submit the resident form to see the same report here.",
                      "Hantar borang penduduk untuk melihat laporan yang sama di sini.",
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => update({ view: "resident" })}
                  >
                    {copy("Create report", "Buat laporan")}
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <div className={styles.inboxNote}>
                <ShieldCheck size={18} />
                <p>
                  {copy(
                    "Demo operator workspace. Actions update this sample report only.",
                    "Ruang operator demo. Tindakan mengemas kini laporan contoh ini sahaja.",
                  )}
                </p>
              </div>
            </aside>
            <section className={styles.reportDetail}>
              <div className={styles.sectionHeading}>
                <span className={styles.iconTile}>
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <h3>
                    {copy(
                      "Review. Respond. Follow through.",
                      "Semak. Respons. Ambil tindakan.",
                    )}
                  </h3>
                  <p>
                    {copy(
                      "The resident’s photo, location and details, together.",
                      "Foto, lokasi dan butiran penduduk dalam satu paparan.",
                    )}
                  </p>
                </div>
              </div>
              <div className={styles.detailGrid}>
                {photo()}
                <div className={styles.detailCopy}>
                  <span className={styles.inboxTag}>{scenario.category}</span>
                  <h4>{state.title}</h4>
                  <p>{state.description}</p>
                  <span className={styles.reporter}>
                    <UserRound size={16} />
                    {copy("Demo resident", "Penduduk demo")}
                  </span>
                </div>
              </div>
              {locationCard()}
              {timeline()}
              <div className={styles.operatorAction}>
                <p>
                  {state.stage < 2
                    ? copy(
                        "Confirm the report has been seen.",
                        "Sahkan laporan telah disemak.",
                      )
                    : state.stage === 2
                      ? copy(
                          "Keep the resident informed as work starts.",
                          "Maklumkan penduduk apabila kerja bermula.",
                        )
                      : state.stage === 3
                        ? copy(
                            "Close the loop when the example issue is resolved.",
                            "Lengkapkan proses apabila isu contoh selesai.",
                          )
                        : copy(
                            "A response the resident can see.",
                            "Respons yang boleh dilihat penduduk.",
                          )}
                </p>
                <div>
                  {state.stage > 0 && state.stage < 4 && (
                    <button
                      className={styles.primary}
                      type="button"
                      onClick={advance}
                    >
                      <CheckCircle2 size={18} />
                      {state.stage === 1
                        ? copy("Acknowledge report", "Terima laporan")
                        : state.stage === 2
                          ? copy("Mark in progress", "Tandakan dalam tindakan")
                          : copy("Mark resolved", "Tandakan selesai")}
                    </button>
                  )}
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={() =>
                      update({ view: state.stage ? "passenger" : "resident" })
                    }
                  >
                    {state.stage
                      ? copy("View as passenger", "Lihat sebagai penumpang")
                      : copy("Create resident report", "Buat laporan penduduk")}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {state.view === "passenger" && (
          <section className={styles.passengerGrid}>
            <div>
              <span className={styles.passengerEyebrow}>
                <UserRound size={15} />
                {copy("PASSENGER VIEW", "PAPARAN PENUMPANG")}
              </span>
              <h3 className={styles.passengerTitle}>
                {state.stage >= 2
                  ? copy(
                      "Your voice. A visible response.",
                      "Suara anda. Respons yang jelas.",
                    )
                  : copy(
                      "Your community, connected.",
                      "Komuniti anda, berhubung.",
                    )}
              </h3>
              <p className={styles.passengerIntro}>
                {copy(
                  "Follow the same report from your first photo to the operator’s latest update.",
                  "Ikuti laporan yang sama daripada foto pertama hingga kemas kini terkini operator.",
                )}
              </p>
              <div className={styles.updateCard}>
                <span className={styles.updateIcon}>
                  {state.stage >= 2 ? (
                    <CheckCircle2 size={25} />
                  ) : (
                    <Clock3 size={25} />
                  )}
                </span>
                <div>
                  <small>
                    {copy("LATEST REPORT UPDATE", "KEMAS KINI LAPORAN TERKINI")}
                  </small>
                  <h4>{labels[state.stage]}</h4>
                  <p>
                    {state.stage === 0
                      ? copy(
                          "Your draft is ready. Submit it to start the report journey.",
                          "Draf anda sedia. Hantar untuk memulakan proses laporan.",
                        )
                      : state.stage === 1
                        ? copy(
                            "Your report is in the operator inbox, awaiting review.",
                            "Laporan anda berada dalam peti masuk operator, menunggu semakan.",
                          )
                        : state.stage === 2
                          ? copy(
                              "The operator has reviewed and acknowledged your report.",
                              "Operator telah menyemak dan menerima laporan anda.",
                            )
                          : state.stage === 3
                            ? copy(
                                "The operator has marked your report as in progress.",
                                "Operator menandakan laporan anda dalam tindakan.",
                              )
                            : copy(
                                "The operator has marked this example issue as resolved.",
                                "Operator menandakan isu contoh ini telah selesai.",
                              )}
                  </p>
                </div>
              </div>
              {timeline()}
              <button
                className={styles.secondary}
                type="button"
                onClick={() =>
                  update({ view: state.stage ? "operator" : "resident" })
                }
              >
                {state.stage
                  ? copy("Back to operator", "Kembali ke operator")
                  : copy(
                      "Finish resident report",
                      "Lengkapkan laporan penduduk",
                    )}
                <ArrowRight size={16} />
              </button>
            </div>
            <article className={styles.passengerReport}>
              {photo()}
              <div className={styles.passengerReportBody}>
                <span className={styles.reportId}>{state.reportId}</span>
                <h4>{state.title}</h4>
                <p>{state.description}</p>
                {locationCard()}
              </div>
            </article>
          </section>
        )}
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      </div>
      <footer className={styles.footer}>
        <span>
          <CircleDot size={12} />
          {copy(
            "Sample report · saved in this browser · no real report is sent",
            "Laporan contoh · disimpan dalam pelayar ini · tiada laporan sebenar dihantar",
          )}
        </span>
        <strong>GERAK</strong>
      </footer>
    </dialog>
  );
}
