"use client";

import * as React from "react";

/** `undefined` during SSR / before hydration — callers often treat as `false`. */
export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
