"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale, Stop } from "@/lib/types";
import { searchStops } from "@/lib/stop-search";

export function LocationSearch({
  label,
  stops,
  candidates = stops,
  value,
  onChange,
  locale,
  emptyMessage,
}: {
  label: string;
  stops: Stop[];
  /** Endpoints actually offered for this leg; defaults to every stop. */
  candidates?: Stop[];
  value: string;
  onChange: (id: string) => void;
  locale: Locale;
  emptyMessage?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = stops.find((stop) => stop.id === value);
  // Filter on what the user typed, never on the chosen stop's name: reusing the
  // name would collapse the list to one row and make the endpoint unbrowseable.
  const matches = useMemo(
    () => searchStops(candidates, query),
    [candidates, query],
  );
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = list.current;
    const option = panel?.children[active] as HTMLElement | undefined;
    if (!panel || !option) return;
    if (option.offsetTop < panel.scrollTop) panel.scrollTop = option.offsetTop;
    else if (
      option.offsetTop + option.offsetHeight >
      panel.scrollTop + panel.clientHeight
    )
      panel.scrollTop =
        option.offsetTop + option.offsetHeight - panel.clientHeight;
  }, [active, open, query]);
  const choose = (stop: Stop) => {
    onChange(stop.id);
    setQuery("");
    setOpen(false);
  };
  return (
    <div className="location-search">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={
          open && matches[active] ? `${id}-option-${active}` : undefined
        }
        placeholder={
          locale === "ms"
            ? "Cari nama atau ID hentian"
            : "Search stop name or ID"
        }
        value={selected ? selected.name : query}
        onClick={() => setOpen(true)}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
              Math.max(
                0,
                Math.min(
                  matches.length - 1,
                  open ? index + (event.key === "ArrowDown" ? 1 : -1) : 0,
                ),
              ),
            );
          }
          if (event.key === "Enter" && open && matches[active]) {
            event.preventDefault();
            choose(matches[active]);
          }
        }}
      />
      {open && (
        <div
          className="location-options"
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
        >
          {matches.map((stop, index) => (
            <div
              key={stop.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(stop)}
            >
              <strong>{stop.name}</strong>
              <small>{stop.id}</small>
            </div>
          ))}
          {!matches.length && (
            <p role="status">
              {emptyMessage ??
                (locale === "ms"
                  ? "Tiada hentian sepadan. Cuba nama lain."
                  : "No matching stops. Try another name.")}
            </p>
          )}
          {!query && matches.length > 12 && (
            <p role="status">
              {locale === "ms"
                ? `${matches.length} pilihan — scroll atau taip untuk menapis.`
                : `${matches.length} choices — scroll or type to narrow it down.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
