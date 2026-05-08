import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kan Tahlili Değerlendirme Sistemi",
  description:
    "Gemini destekli kurumsal laboratuvar analiz ve klinik ön değerlendirme paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        {children}
      </body>
    </html>
  );
}