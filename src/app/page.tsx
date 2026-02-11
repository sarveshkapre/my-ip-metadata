import MyIpPage from "./_components/MyIpPage";
import { parseWhoAmIFlags } from "@/lib/searchParams";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolved = await searchParams;
  const { enrich, showHeaders } = parseWhoAmIFlags(resolved);
  return <MyIpPage initialEnrich={enrich} initialShowHeaders={showHeaders} />;
}
