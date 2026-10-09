"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Appearance = "dark" | "light";
function applyAppearance(theme: Appearance) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#ffffff" : "#11151b");
}
export function AppearancePicker({ locale }: { locale: "en" | "ms" }) {
  const [choice, setChoice] = useState<Appearance>("dark");
  useEffect(() => {
    const read = () => {
      let value: string | null = null;
      try {
        value = localStorage.getItem("gerak-appearance");
      } catch {}
      const theme = value === "light" ? "light" : "dark";
      setChoice(theme);
      applyAppearance(theme);
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  const label =
    choice === "dark"
      ? locale === "ms"
        ? "Tukar ke mod terang"
        : "Switch to light mode"
      : locale === "ms"
        ? "Tukar ke mod gelap"
        : "Switch to dark mode";
  const Icon = choice === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      className="appearance-picker"
      aria-label={label}
      title={label}
      onClick={() => {
        const theme = choice === "dark" ? "light" : "dark";
        setChoice(theme);
        try {
          localStorage.setItem("gerak-appearance", theme);
        } catch {}
        applyAppearance(theme);
      }}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
