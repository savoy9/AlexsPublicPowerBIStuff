import type { ReactNode } from "react";
import { useCssTheme } from "@microsoft/fabric-visuals";
import { ThemeContext } from "@/hooks/theme.context";

export function ReportTestTheme({ children }: { children: ReactNode }) {
    const theme = useCssTheme();
    return <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => undefined, theme }}>{children}</ThemeContext.Provider>;
}
