import type { Metadata } from "next";

import { IdeasView } from "@/views/ideas";

export const metadata: Metadata = {
  title: "Background ideas",
  robots: { index: false },
};

export default function IdeasPage() {
  return <IdeasView />;
}
