"use client";

import { useEffect, useState } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { AnalizSonucu } from "./types/kanTahlili";
import { KanTahliliPdfBelgesi } from "./lib/kanTahliliPdfBelgesi";
import { KanTahliliKlasikBelgesi } from "./lib/kanTahliliKlasikBelgesi";

// Canlı PDF önizlemesi. Sol taraftaki editörde yapılan her değişiklik
// buraya "sonuc" olarak gelir; kısa bir gecikmeyle (debounce) PDF yeniden
// render edilir - böylece her tuş vuruşunda değil, kullanıcı durunca
// güncellenir (tarayıcı boğulmaz).
//
// NOT: PDFViewer yalnızca tarayıcıda çalışır. Bu bileşen page.tsx'e
// next/dynamic ile ssr:false olarak yüklenir (sunucuda render edilmez).
export default function CanliOnizleme({
  sonuc,
  sablon,
}: {
  sonuc: AnalizSonucu;
  sablon: "modern" | "klasik";
}) {
  // Debounce edilmiş kopyalar: gerçek "sonuc"/"sablon" değişince 600ms
  // sonra bunlar güncellenir ve PDF yeniden çizilir.
  const [gecikmisSonuc, setGecikmisSonuc] = useState<AnalizSonucu>(sonuc);
  const [gecikmisSablon, setGecikmisSablon] = useState(sablon);
  const [guncelleniyor, setGuncelleniyor] = useState(false);

  useEffect(() => {
    setGuncelleniyor(true);
    const zamanlayici = setTimeout(() => {
      setGecikmisSonuc(sonuc);
      setGecikmisSablon(sablon);
      setGuncelleniyor(false);
    }, 600);

    return () => clearTimeout(zamanlayici);
  }, [sonuc, sablon]);

  const belge =
    gecikmisSablon === "klasik"
      ? KanTahliliKlasikBelgesi({ sonuc: gecikmisSonuc })
      : KanTahliliPdfBelgesi({ sonuc: gecikmisSonuc });

  return (
    <div className="relative h-full w-full">
      {guncelleniyor && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-cyan-200 backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          Önizleme güncelleniyor...
        </div>
      )}

      {/* PDFViewer, tarayıcının yerleşik PDF görüntüleyicisini kullanır;
          gerçek çıktının BİREBİR aynısını gösterir. */}
      <PDFViewer
        showToolbar
        className="h-full w-full rounded-2xl border border-slate-200 dark:border-white/10"
        style={{ minHeight: "100%" }}
      >
        {belge as any}
      </PDFViewer>
    </div>
  );
}