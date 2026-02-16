import { redirect } from "next/navigation";
import { getLocale } from "@/i18n/getLocale";

export default async function Home() {
  const locale = await getLocale();
  redirect(`/${locale}`);
}
