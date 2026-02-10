import MyIpPage from "../_components/MyIpPage";
import { parseWhoAmIFlags } from "@/lib/searchParams";

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { enrich, showHeaders } = parseWhoAmIFlags(searchParams);
  return <MyIpPage initialEnrich={enrich} initialShowHeaders={showHeaders} />;
}
