import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { brand } from "@/lib/brand";
import "./teams.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-teams-sans",
});

export const metadata: Metadata = {
  title: {
    default: `Teams · ${brand.name}`,
    template: `%s · ${brand.name} Teams`,
  },
  description: `Team leader dashboard for ${brand.legalName}`,
};

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${plex.variable} teams-app min-h-dvh antialiased`}>
      {children}
    </div>
  );
}
