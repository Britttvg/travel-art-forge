import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

const getSystemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setThemeState(saved);
  }, []);

  useEffect(() => {
    let appliedTheme = theme;
    if (theme === "system") appliedTheme = getSystemTheme();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(appliedTheme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      const handler = () => {
        const sysTheme = getSystemTheme();
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(sysTheme);
      };
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", handler);
      return () => {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", handler);
      };
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
