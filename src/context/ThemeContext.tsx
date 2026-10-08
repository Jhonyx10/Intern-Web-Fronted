import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useSettings } from "@/lib/queries/settings";

export interface ThemePreset {
  name: string;
  hex: string;
  hover: string;
  soft: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Navy", hex: "#16305C", hover: "#0F2245", soft: "#dde4ee" },
  { name: "Emerald", hex: "#0b6e4f", hover: "#095c42", soft: "#d8f3e7" },
  { name: "Indigo", hex: "#4f46e5", hover: "#4338ca", soft: "#e0e7ff" },
  { name: "Sky Blue", hex: "#0284c7", hover: "#0369a1", soft: "#e0f2fe" },
  { name: "Violet", hex: "#7c3aed", hover: "#6d28d9", soft: "#ede9fe" },
  { name: "Rose", hex: "#e11d48", hover: "#be123c", soft: "#ffe4e6" },
  { name: "Amber", hex: "#d97706", hover: "#b45309", soft: "#fef3c7" },
  { name: "Slate", hex: "#0f172a", hover: "#020617", soft: "#f1f5f9" },
];

/**
 * Turns saved theme values into a full set of colors. Missing hover/soft
 * values fall back to the matching preset, then to the base color.
 * Shared by the app theme and the per-department cards.
 */
export function resolveThemeColors(
  t?: {
    theme_color?: string | null;
    theme_color_hover?: string | null;
    theme_color_soft?: string | null;
  } | null
) {
  const color = t?.theme_color || "#16305C";
  const preset = THEME_PRESETS.find(
    (p) => p.hex.toLowerCase() === color.toLowerCase()
  );

  return {
    color,
    hover: t?.theme_color_hover || preset?.hover || color,
    soft: t?.theme_color_soft || preset?.soft || `${color}1e`,
  };
}

interface ThemeContextType {
  themeColor: string;
  hoverColor: string;
  softColor: string;
  logoUrl?: string | null;
  departmentName?: string | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: "#16305C",
  hoverColor: "#0F2245",
  softColor: "#dde4ee",
  logoUrl: null,
  departmentName: null,
  isLoading: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: settings, isLoading } = useSettings();

  const { activeColor, hoverColor, softColor } = useMemo(() => {
    const { color, hover, soft } = resolveThemeColors(settings);
    return { activeColor: color, hoverColor: hover, softColor: soft };
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-accent", activeColor);
    root.style.setProperty("--color-accent-hover", hoverColor);
    root.style.setProperty("--color-accent-soft", softColor);
  }, [activeColor, hoverColor, softColor]);

  return (
    <ThemeContext.Provider
      value={{
        themeColor: activeColor,
        hoverColor,
        softColor,
        logoUrl: settings?.logo_url || null,
        departmentName: settings?.department_name || null,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);