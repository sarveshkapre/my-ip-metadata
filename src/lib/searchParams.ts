export type PageSearchParams = Record<string, string | string[] | undefined> | undefined;

export function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

// Repo convention: query param "0" means false; everything else (including absent) means true.
export function truthyParam(v: string | string[] | undefined, defaultValue = true): boolean {
  const s = firstParam(v);
  if (s === undefined) return defaultValue;
  return s !== "0";
}

export function parseWhoAmIFlags(searchParams: PageSearchParams): { enrich: boolean; showHeaders: boolean } {
  return {
    enrich: truthyParam(searchParams?.enrich, true),
    showHeaders: truthyParam(searchParams?.showHeaders, true),
  };
}

