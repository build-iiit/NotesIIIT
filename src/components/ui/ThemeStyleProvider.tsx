"use client";

import React, { createContext, useContext } from"react";

// Simplified: single theme, no sunset/monochrome toggle.
// Kept as a stub so existing components don't break.

interface ThemeStyleContextType {
 themeStyle:"default";
 setThemeStyle: (style: string) => void;
}

const ThemeStyleContext = createContext<ThemeStyleContextType>({
 themeStyle:"default",
 setThemeStyle: () => {},
});

export function ThemeStyleProvider({ children }: { children: React.ReactNode }) {
 return (
 <ThemeStyleContext.Provider value={{ themeStyle:"default", setThemeStyle: () => {} }}>
 {children}
 </ThemeStyleContext.Provider>
 );
}

export function useThemeStyle() {
 return useContext(ThemeStyleContext);
}
