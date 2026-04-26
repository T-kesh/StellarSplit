const STORAGE_KEY = "app-theme";

type Theme = "light" | "dark" | "system";

export function bootstrapTheme() {
  if (typeof window === "undefined") return;

  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const theme = savedTheme || "system";
    
    let resolvedTheme: "light" | "dark";
    if (theme === "system") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      resolvedTheme = theme as "light" | "dark";
    }

    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", resolvedTheme);
  } catch (e) {
    console.error("Theme bootstrap failed", e);
  }
}
