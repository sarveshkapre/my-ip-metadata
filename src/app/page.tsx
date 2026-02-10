import MyIpPage from "./_components/MyIpPage";

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const enrich = first(searchParams?.enrich) !== "0";
  const showHeaders = first(searchParams?.showHeaders) !== "0";
  return <MyIpPage initialEnrich={enrich} initialShowHeaders={showHeaders} />;
}
