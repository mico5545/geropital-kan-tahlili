import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kan Tahlili Değerlendirme Sistemi",
  description:
    "Gemini destekli kurumsal laboratuvar analiz ve klinik ön değerlendirme paneli",
};

// Tema (ve büyük yazı) tercihini React devreye girmeden, sayfa daha ilk
// boyanmadan ÖNCE senkron olarak uygular. Bu olmadan sayfa açılışında
// kısacık "yanlış tema" görünüp sonra doğru temaya geçmesi (FOUC) olurdu.
const temaScripti = `
(function () {
  try {
    var tema = window.localStorage.getItem("geropital-tema");
    var buyukYazi = window.localStorage.getItem("geropital-buyuk-yazi");
    var kok = document.documentElement;

    if (tema === "acik") {
      kok.classList.remove("dark");
    } else {
      kok.classList.add("dark");
    }

    if (buyukYazi === "1") {
      kok.classList.add("buyuk-yazi");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaScripti }} />
      </head>
      <body>{children}</body>
    </html>
  );
}