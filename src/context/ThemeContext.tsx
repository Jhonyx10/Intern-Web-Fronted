import React, { createContext, useContext, useEffect } from "react";
import { useSettings } from "@/lib/queries/settings";

export interface ThemePreset {
  name: string;
  hex: string;
  hover: string;
  soft: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Emerald", hex: "#0b6e4f", hover: "#095c42", soft: "#d8f3e7" },
  { name: "Indigo", hex: "#4f46e5", hover: "#4338ca", soft: "#e0e7ff" },
  { name: "Sky Blue", hex: "#0284c7", hover: "#0369a1", soft: "#e0f2fe" },
  { name: "Violet", hex: "#7c3aed", hover: "#6d28d9", soft: "#ede9fe" },
  { name: "Rose", hex: "#e11d48", hover: "#be123c", soft: "#ffe4e6" },
  { name: "Amber", hex: "#d97706", hover: "#b45309", soft: "#fef3c7" },
  { name: "Slate", hex: "#0f172a", hover: "#020617", soft: "#f1f5f9" },
];

interface ThemeContextType {
  themeColor: string;
  logoUrl?: string | null;
  departmentName?: string | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: "#0b6e4f",
  logoUrl: null,
  departmentName: null,
  isLoading: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: settings, isLoading } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const activeColor = settings?.theme_color || "#0b6e4f";

    // Check if color matches a known preset
    const matchedPreset = THEME_PRESETS.find(
      (p) => p.hex.toLowerCase() === activeColor.toLowerCase()
    );

    const hoverColor =
      settings?.theme_color_hover || matchedPreset?.hover || activeColor;
    const softColor =
      settings?.theme_color_soft || matchedPreset?.soft || `${activeColor}1e`;

    root.style.setProperty("--color-accent", activeColor);
    root.style.setProperty("--color-accent-hover", hoverColor);
    root.style.setProperty("--color-accent-soft", softColor);
  }, [settings]);

  return (
    <ThemeContext.Provider
      value={{
        themeColor: settings?.theme_color || "#0b6e4f",
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
