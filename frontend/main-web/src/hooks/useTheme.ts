import { useCallback, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, resolveDark, storeTheme } from "../lib/theme";
import type { ThemePreference } from "../lib/theme";

export function useTheme() {
    const [preference, setPreference] = useState<ThemePreference>(getStoredTheme);
    const [isDark, setIsDark] = useState(() => resolveDark(getStoredTheme()));

    useEffect(() => {
        applyTheme(preference);
        setIsDark(resolveDark(preference));
        if (preference !== "system") return;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            applyTheme("system");
            setIsDark(media.matches);
        };
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [preference]);

    const setTheme = useCallback((next: ThemePreference) => {
        storeTheme(next);
        setPreference(next);
    }, []);

    const toggle = useCallback(() => {
        setTheme(isDark ? "light" : "dark");
    }, [isDark, setTheme]);

    return { preference, isDark, setTheme, toggle };
}
