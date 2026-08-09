"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnalizSonucu,
  Durum,
  HastaBilgisi,
  KATEGORI_RENK,
  KategoriIkonTuru,
  Parametre,
  kategoriIkonTuruBelirle,
} from "./types/kanTahlili";
import RaporEditoru from "./RaporEditoru";
import dynamic from "next/dynamic";

// PDFViewer yalnızca tarayıcıda çalışır (sunucuda render edilemez), bu
// yüzden canlı önizlemeyi ssr:false ile dinamik yüklüyoruz.
const CanliOnizleme = dynamic(() => import("./CanliOnizleme"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[620px] items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 text-sm text-slate-400">
      Önizleme hazırlanıyor...
    </div>
  ),
});

type FiltreDurumu = "tum" | Durum;

const durumStilleri = {
  normal: {
    etiket: "Normal",
    kart: "border-emerald-300 bg-emerald-50 dark:border-emerald-300/20 dark:bg-emerald-400/10",
    rozet:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/15 dark:text-emerald-200",
  },
  dusuk: {
    etiket: "Düşük",
    kart: "border-sky-300 bg-sky-50 dark:border-sky-300/20 dark:bg-sky-400/10",
    rozet:
      "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/15 dark:text-sky-200",
  },
  yuksek: {
    etiket: "Yüksek",
    kart: "border-orange-300 bg-orange-50 dark:border-orange-300/25 dark:bg-orange-400/10",
    rozet:
      "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-300/20 dark:bg-orange-400/15 dark:text-orange-200",
  },
  kritik: {
    etiket: "Kritik",
    kart: "border-red-300 bg-red-50 dark:border-red-300/30 dark:bg-red-400/10",
    rozet:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-300/20 dark:bg-red-400/15 dark:text-red-200",
  },
};

function listeMetneCevir(liste: string[]) {
  return Array.isArray(liste) ? liste.join("\n") : "";
}

function metniListeyeCevir(metin: string) {
  return metin
    .split("\n")
    .map((satir) => satir.trim())
    .filter(Boolean);
}

// Sunucudan gelen "Content-Disposition: attachment; filename=..." başlığından
// dosya adını çıkarır. Bulunamazsa güvenli bir varsayılana düşer.
function contentDispositionDosyaAdi(baslik: string | null, yedekAd: string) {
  if (!baslik) return yedekAd;

  const eslesme = baslik.match(/filename="?([^";]+)"?/i);
  return eslesme?.[1] || yedekAd;
}

function DnaSeridi({
  ters,
  renk1,
  renk2,
  sure,
}: {
  ters?: boolean;
  renk1: string;
  renk2: string;
  sure: number;
}) {
  const kopyaSayisi = 9;

  return (
    <div
      className={ters ? "dna-serit-yukari" : "dna-serit-asagi"}
      style={{
        animationDuration: `${sure}s, 6s`,
        animationDelay: `0s, ${(sure % 5)}s`,
      }}
    >
      {Array.from({ length: kopyaSayisi }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 60 210"
          className="block w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M30,0 C50,17.5 50,35 30,52.5 C10,70 10,87.5 30,105 C50,122.5 50,140 30,157.5 C10,175 10,192.5 30,210"
            fill="none"
            stroke={renk1}
            strokeWidth={2}
          />
          <path
            d="M30,0 C10,17.5 10,35 30,52.5 C50,70 50,87.5 30,105 C10,122.5 10,140 30,157.5 C50,175 50,192.5 30,210"
            fill="none"
            stroke={renk2}
            strokeWidth={2}
          />
          <line x1={10} y1={26.25} x2={50} y2={26.25} stroke={renk1} strokeWidth={1} opacity={0.5} />
          <line x1={50} y1={78.75} x2={10} y2={78.75} stroke={renk2} strokeWidth={1} opacity={0.5} />
          <line x1={10} y1={131.25} x2={50} y2={131.25} stroke={renk1} strokeWidth={1} opacity={0.5} />
          <line x1={50} y1={183.75} x2={10} y2={183.75} stroke={renk2} strokeWidth={1} opacity={0.5} />
          <circle cx={30} cy={0} r={2.2} fill={renk2} />
          <circle cx={30} cy={52.5} r={2.2} fill={renk1} />
          <circle cx={30} cy={105} r={2.2} fill={renk2} />
          <circle cx={30} cy={157.5} r={2.2} fill={renk1} />
        </svg>
      ))}
    </div>
  );
}

// Marka rengi TURKUAZ/TEAL ailesi. Önceki palette mor/indigo gibi marka
// dışı neon tonlar vardı; burada hepsi turkuaz-camgöbeği-teal skalasında,
// birbirinden ince tonlarla ayrılıyor - kurumsal ve tutarlı bir his.
const DNA_RENK_PALETI: [string, string][] = [
  ["#5eead4", "#2dd4bf"], // açık turkuaz - turkuaz
  ["#67e8f9", "#22d3ee"], // camgöbeği
  ["#2dd4bf", "#14b8a6"], // teal
  ["#7dd3fc", "#38bdf8"], // gökyüzü mavisi (marka aksanı)
  ["#5eead4", "#0d9488"], // turkuaz - koyu teal
  ["#22d3ee", "#0891b2"], // camgöbeği - koyu
  ["#99f6e4", "#5eead4"], // çok açık turkuaz
  ["#38bdf8", "#0ea5e9"], // mavi aksan
];

// Tüm sayfa genişliğine yayılmış, SIK dizilmiş, göz yormayacak kadar soluk
// dekoratif bir DNA arka planı. `aktif=false` iken (analiz sürerken)
// render edilmez - iki ağır efekt aynı anda tarayıcıyı zorlamasın diye.
function DnaArkaplan({ aktif }: { aktif: boolean }) {
  if (!aktif) return null;

  return (
    <>
      {/* İnce blueprint ızgarası - yalnızca koyu temada, laboratuvar hissi */}
      <div className="lab-izgara pointer-events-none fixed inset-0 z-0 hidden dark:block" />

      {/* Yükselen kabarcıklar - yalnızca koyu temada */}
      <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden opacity-70 dark:block">
        <LabKabarciklari />
      </div>

      {/* DNA sarmalları */}
      <div
        aria-hidden
        className="dna-arkaplan pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.16]"
      >
        <div className="grid h-full grid-flow-col auto-cols-fr gap-2 px-1 sm:gap-3 lg:gap-4">
          {DNA_RENK_PALETI.map(([renk1, renk2], i) => (
            <DnaSeridi
              key={i}
              renk1={renk1}
              renk2={renk2}
              ters={i % 2 === 1}
              sure={30 + (i % 4) * 6}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// Laboratuvar atmosferi: dipten yüzeye yavaşça yükselen, farklı boyut ve
// hızlarda kabarcıklar. Tıpkı bir numune tüpü / kültür ortamı gibi. Salt
// dekoratif, düşük opaklıkta, içerikle çakışmaz.
function LabKabarciklari() {
  const kabarciklar = [
    { sol: "8%", boyut: 26, sure: 15, gecikme: 0 },
    { sol: "18%", boyut: 14, sure: 12, gecikme: 3 },
    { sol: "30%", boyut: 34, sure: 19, gecikme: 6 },
    { sol: "44%", boyut: 18, sure: 14, gecikme: 1 },
    { sol: "57%", boyut: 24, sure: 17, gecikme: 4 },
    { sol: "68%", boyut: 12, sure: 11, gecikme: 7 },
    { sol: "79%", boyut: 30, sure: 20, gecikme: 2 },
    { sol: "90%", boyut: 16, sure: 13, gecikme: 5 },
  ];

  return (
    <>
      {kabarciklar.map((k, i) => (
        <span
          key={i}
          className="kabarcik"
          style={{
            left: k.sol,
            width: k.boyut,
            height: k.boyut,
            animationDuration: `${k.sure}s`,
            animationDelay: `${k.gecikme}s`,
          }}
        />
      ))}
    </>
  );
}

// Sonuç ekrana gelince 0'dan hedef değere doğru sayarak beliren rakam.
// Salt görsel bir dokunuş: özet kutularının (Toplam/Normal/... ) daha
// "canlı" hissettirmesi için.
function SayiSayaci({ hedef, sure = 700 }: { hedef: number; sure?: number }) {
  const [deger, setDeger] = useState(0);
  const baslangicRef = useRef<number | null>(null);

  useEffect(() => {
    baslangicRef.current = null;
    let kareId: number;

    function adim(zaman: number) {
      if (baslangicRef.current === null) baslangicRef.current = zaman;
      const gecen = zaman - baslangicRef.current;
      const oran = Math.min(1, gecen / sure);
      setDeger(Math.round(oran * hedef));

      if (oran < 1) {
        kareId = requestAnimationFrame(adim);
      }
    }

    kareId = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kareId);
  }, [hedef, sure]);

  return <>{deger}</>;
}

// Kenarında yavaşça akan renkli bir gradyan çerçeve gösteren kart
// kabuğu. İçini (children) olduğu gibi sarar, kartın kendi arka
// planı/stilini değiştirmez - sadece etrafına parlayan bir kenarlık ekler.
function ParlakKart({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`parlak-cerceve ${className}`}>
      <div className="h-full rounded-[calc(1.5rem-1.6px)]">{children}</div>
    </div>
  );
}

// PDF şablonundaki (kanTahliliPdfBelgesi.tsx) kategori ikonlarıyla AYNI
// şekiller - burada react-pdf'in özel Svg bileşenleri yerine sıradan HTML
// <svg> etiketleri kullanılıyor (ikisi de standart SVG olduğu için şekil
// verisi birebir aynı kalabiliyor). Böylece ekran ile PDF görsel olarak
// tutarlı olur.
function KategoriIkonGovdesi({ tur }: { tur: KategoriIkonTuru }) {
  const beyaz = "#ffffff";

  switch (tur) {
    case "damla":
      return (
        <>
          <polygon points="8,2 12.2,9.2 3.8,9.2" fill={beyaz} />
          <circle cx={8} cy={10.3} r={3.6} fill={beyaz} />
        </>
      );
    case "molekul":
      return (
        <>
          <line x1={5} y1={6} x2={11} y2={6} stroke={beyaz} strokeWidth={1.2} />
          <line x1={5} y1={6} x2={8} y2={11.5} stroke={beyaz} strokeWidth={1.2} />
          <line x1={11} y1={6} x2={8} y2={11.5} stroke={beyaz} strokeWidth={1.2} />
          <circle cx={5} cy={6} r={1.7} fill={beyaz} />
          <circle cx={11} cy={6} r={1.7} fill={beyaz} />
          <circle cx={8} cy={11.5} r={1.7} fill={beyaz} />
        </>
      );
    case "huni":
      return <polygon points="2.5,3 13.5,3 9,9 9,13.5 7,13.5 7,9" fill={beyaz} />;
    case "kalkan":
      return (
        <>
          <polygon points="8,1.5 14,4 14,8 8,14.5 2,8 2,4" fill={beyaz} />
          <polygon
            points="7,4.5 9,4.5 9,7 11.5,7 11.5,9 9,9 9,11.5 7,11.5 7,9 4.5,9 4.5,7 7,7"
            fill="currentColor"
          />
        </>
      );
    case "hedef":
      return (
        <>
          <circle cx={8} cy={8} r={6.2} stroke={beyaz} strokeWidth={1.3} fill="none" />
          <circle cx={8} cy={8} r={3.4} fill={beyaz} />
          <circle cx={8} cy={8} r={1.1} fill="currentColor" />
        </>
      );
    case "gunes":
      return (
        <>
          <circle cx={8} cy={8} r={3} fill={beyaz} />
          <line x1={8} y1={1} x2={8} y2={3.3} stroke={beyaz} strokeWidth={1.2} />
          <line x1={8} y1={12.7} x2={8} y2={15} stroke={beyaz} strokeWidth={1.2} />
          <line x1={1} y1={8} x2={3.3} y2={8} stroke={beyaz} strokeWidth={1.2} />
          <line x1={12.7} y1={8} x2={15} y2={8} stroke={beyaz} strokeWidth={1.2} />
          <line x1={3.05} y1={3.05} x2={4.7} y2={4.7} stroke={beyaz} strokeWidth={1.2} />
          <line x1={11.3} y1={11.3} x2={12.95} y2={12.95} stroke={beyaz} strokeWidth={1.2} />
          <line x1={3.05} y1={12.95} x2={4.7} y2={11.3} stroke={beyaz} strokeWidth={1.2} />
          <line x1={11.3} y1={4.7} x2={12.95} y2={3.05} stroke={beyaz} strokeWidth={1.2} />
        </>
      );
    case "erlen":
      return <polygon points="6,1.5 10,1.5 10,5.5 14,14.5 2,14.5 6,5.5" fill={beyaz} />;
    case "kalp":
      return (
        <polygon
          points="8,14 2.5,8.5 2.5,5 5,3 8,5 11,3 13.5,5 13.5,8.5"
          fill={beyaz}
        />
      );
    case "bolt":
      return <polygon points="9,1 3.5,9 7.5,9 6.5,15 12.5,7 8.5,7" fill={beyaz} />;
    case "tiroid":
      return (
        <>
          <circle cx={5.5} cy={9} r={3.2} fill={beyaz} />
          <circle cx={10.5} cy={9} r={3.2} fill={beyaz} />
          <line x1={8} y1={6} x2={8} y2={9} stroke={beyaz} strokeWidth={1.4} />
        </>
      );
    default:
      return (
        <>
          <circle cx={8} cy={8} r={6} stroke={beyaz} strokeWidth={1.2} fill="none" />
          <circle cx={8} cy={8} r={1.6} fill={beyaz} />
        </>
      );
  }
}

function KategoriRozeti({ kategori }: { kategori: string }) {
  const tur = kategoriIkonTuruBelirle(kategori);
  const renk = KATEGORI_RENK[tur];

  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: renk }}
      title={kategori}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4">
        <KategoriIkonGovdesi tur={tur} />
      </svg>
    </span>
  );
}

export default function AnaSayfa() {
  const [dosya, setDosya] = useState<File | null>(null);
  const [sonuc, setSonuc] = useState<AnalizSonucu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [hataAnahtari, setHataAnahtari] = useState(0);
  const [arama, setArama] = useState("");
  const [durumFiltresi, setDurumFiltresi] = useState<FiltreDurumu>("tum");
  const [tema, setTema] = useState<"koyu" | "acik">("koyu");
  const [buyukYazi, setBuyukYazi] = useState(false);
  const [surukleniyorMu, setSurukleniyorMu] = useState(false);
  const [analizAsamasi, setAnalizAsamasi] = useState(0);
  const [pdfBasariToastu, setPdfBasariToastu] = useState(false);
  const [whatsappTelefon, setWhatsappTelefon] = useState("");
  const [sablon, setSablon] = useState<"modern" | "klasik">("modern");
  const [editorAcik, setEditorAcik] = useState(false);

  // Tema ve büyük-yazı tercihini tarayıcıya kaydet, sayfa açılışında geri
  // yükle. Bu bir Next.js "artifact"i değil, kullanıcının kendi
  // tarayıcısında çalışan gerçek bir uygulama olduğu için localStorage
  // kullanımı tamamen güvenli ve standart bir pratiktir.
  useEffect(() => {
    const kayitliTema = window.localStorage.getItem("geropital-tema");
    const kayitliBuyukYazi = window.localStorage.getItem("geropital-buyuk-yazi");

    if (kayitliTema === "acik" || kayitliTema === "koyu") {
      setTema(kayitliTema);
    }
    if (kayitliBuyukYazi === "1") {
      setBuyukYazi(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "koyu");
    window.localStorage.setItem("geropital-tema", tema);
  }, [tema]);

  useEffect(() => {
    document.documentElement.classList.toggle("buyuk-yazi", buyukYazi);
    window.localStorage.setItem("geropital-buyuk-yazi", buyukYazi ? "1" : "0");
  }, [buyukYazi]);

  // PDF başarıyla indiğinde kısa süreliğine görünen onay toast'ı.
  useEffect(() => {
    if (!pdfBasariToastu) return;
    const zamanlayici = setTimeout(() => setPdfBasariToastu(false), 3200);
    return () => clearTimeout(zamanlayici);
  }, [pdfBasariToastu]);

  // Hata mesajını gösterirken hem metni ayarlar hem de "sallanma"
  // animasyonunun tekrar tetiklenmesi için anahtarı artırır. Böylece
  // useEffect içinde setState çağırma anti-pattern'ine gerek kalmaz.
  function hataGoster(mesaj: string) {
    setHata(mesaj);
    if (mesaj) setHataAnahtari((k) => k + 1);
  }

  // Hem "PDF Seç" ile hem sürükle-bırak ile gelen dosya için ortak mantık.
  function dosyaAyarla(secilenDosya: File | null | undefined) {
    if (!secilenDosya) return;

    if (secilenDosya.type !== "application/pdf") {
      hataGoster("Lütfen yalnızca PDF dosyası yükleyin.");
      return;
    }

    setDosya(secilenDosya);
    setSonuc(null);
    setHata("");
    setArama("");
    setDurumFiltresi("tum");
  }

  function dosyaSecildi(event: React.ChangeEvent<HTMLInputElement>) {
    dosyaAyarla(event.target.files?.[0]);
  }

  function surukleBirakSurukleniyor(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setSurukleniyorMu(true);
  }

  function surukleBirakAyrildi(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setSurukleniyorMu(false);
  }

  function surukleBirakBirakildi(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setSurukleniyorMu(false);
    dosyaAyarla(event.dataTransfer.files?.[0]);
  }

  async function analiziBaslat() {
    if (!dosya) {
      hataGoster("Lütfen önce bir PDF dosyası seçin.");
      return;
    }

    // Sunucudan gerçek zamanlı ilerleme bilgisi almıyoruz (bu, ayrı bir
    // backend değişikliği gerektirir); bunun yerine akışın gerçek
    // aşamalarını makul bir zamanlamayla gösteriyoruz - kullanıcı neyin
    // beklendiğini görür, tek satırlık belirsiz bir mesaj yerine.
    setAnalizAsamasi(1);
    const asama2Zamanlayici = setTimeout(() => setAnalizAsamasi(2), 700);

    try {
      setYukleniyor(true);
      setHata("");
      setSonuc(null);

      const formData = new FormData();
      formData.append("dosya", dosya);

      const cevap = await fetch("/api/kan-tahlili-analiz", {
        method: "POST",
        body: formData,
      });

      let veri;
      try {
        veri = await cevap.json();
      } catch (parseError: any) {
        const responseText = await cevap.text();
        console.error("JSON Parse Hatası:", parseError.message);
        console.error("Response Metni:", responseText);
        throw new Error(
          `JSON Parse Hatası: ${parseError.message}. Response: ${responseText.substring(0, 200)}`
        );
      }

      if (!cevap.ok) {
        let hataMesaji = veri.hata || "Analiz sırasında bir hata oluştu.";

        if (cevap.status === 429 && veri.onerilen) {
          hataMesaji = `${hataMesaji}\n\n${veri.detay}\n\n✓ ${veri.onerilen}`;
        } else if (veri.detay) {
          hataMesaji = `${hataMesaji} Detay: ${veri.detay}`;
        }

        throw new Error(hataMesaji);
      }

      setAnalizAsamasi(3);
      setSonuc(veri);
    } catch (error: any) {
      hataGoster(error.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      clearTimeout(asama2Zamanlayici);
      setYukleniyor(false);
      setAnalizAsamasi(0);
    }
  }

  // PDF artık tarayıcının window.print() özelliğiyle DEĞİL, sunucuda
  // React-PDF ile üretiliyor. Böylece çıktı hangi tarayıcıdan/cihazdan
  // indirilirse indirilsin BİREBİR AYNI olur ve içerik asla kırpılmaz.
  async function pdfOlustur() {
    if (!sonuc) return;

    try {
      setPdfHazirlaniyor(true);
      setHata("");

      const cevap = await fetch("/api/kan-tahlili-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sonuc, sablon }),
      });

      if (!cevap.ok) {
        const veri = await cevap.json().catch(() => null);
        throw new Error(veri?.hata || "PDF oluşturulamadı.");
      }

      const blob = await cevap.blob();
      const dosyaAdi = contentDispositionDosyaAdi(
        cevap.headers.get("Content-Disposition"),
        "kan-tahlili-raporu.pdf"
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = dosyaAdi;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPdfBasariToastu(true);
    } catch (error: any) {
      hataGoster(error.message || "PDF oluşturulurken bir hata oluştu.");
    } finally {
      setPdfHazirlaniyor(false);
    }
  }

  // ÖNEMLİ SINIRLAMA: WhatsApp'ın ücretsiz "click-to-chat" bağlantısı
  // (wa.me) sadece HAZIR YAZILI bir mesaj açabilir - bir dosyayı otomatik
  // olarak eklemenin ücretsiz/basit bir yolu yok (bu ancak ücretli,
  // onaylı bir "WhatsApp Business API" hesabıyla mümkün, ki bu da
  // "ücretsiz kalsın" hedefiyle çelişir). Bu yüzden burada WhatsApp'ı
  // hazır bir mesajla açıyoruz; PDF zaten "PDF Oluştur" ile inmiş
  // olacağından, kullanıcı açılan sohbette dosyayı tek tıkla ekleyip
  // gönderebilir.
  function whatsaptanGonder() {
    if (!sonuc) return;

    const hastaAdi = sonuc.hastaBilgisi?.adSoyad || "Hasta";
    const mesaj = `Merhaba, ${hastaAdi} için kan tahlili değerlendirme raporu ektedir. (Lütfen az önce indirilen PDF dosyasını bu sohbete ekleyin.)`;
    const temizTelefon = whatsappTelefon.replace(/[^0-9]/g, "");

    const url = temizTelefon
      ? `https://wa.me/${temizTelefon}?text=${encodeURIComponent(mesaj)}`
      : `https://wa.me/?text=${encodeURIComponent(mesaj)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function sonucAlaniGuncelle<K extends keyof AnalizSonucu>(
    alan: K,
    deger: AnalizSonucu[K]
  ) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;

      return {
        ...onceki,
        [alan]: deger,
      };
    });
  }

  function hastaBilgisiAlaniGuncelle<K extends keyof HastaBilgisi>(
    alan: K,
    deger: HastaBilgisi[K]
  ) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;

      return {
        ...onceki,
        hastaBilgisi: {
          ...onceki.hastaBilgisi,
          [alan]: deger,
        },
      };
    });
  }

  const filtrelenmisParametreler = useMemo(() => {
    if (!sonuc?.parametreler) return [];

    return sonuc.parametreler.filter((item) => {
      const aramaUyumlu =
        item.parametre.toLowerCase().includes(arama.toLowerCase()) ||
        item.kategori.toLowerCase().includes(arama.toLowerCase());

      const durumUyumlu =
        durumFiltresi === "tum" ? true : item.durum === durumFiltresi;

      return aramaUyumlu && durumUyumlu;
    });
  }, [sonuc, arama, durumFiltresi]);

  const kritikVarMi = (sonuc?.ozet?.kritikSayisi || 0) > 0;

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-[#06131a] text-slate-900 dark:text-white">
      <DnaArkaplan aktif={!yukleniyor} />
      {yukleniyor && (
        <div className="analiz-yukleniyor-kaplama">
          <div className="analiz-yukleniyor-kart">
            <img
              src="/logoGeropital.png"
              alt="Geropital Logo"
              className="analiz-yukleniyor-logo"
            />

            <div className="daktilo-yazi">GEROPITAL</div>

            <p>
              {analizAsamasi >= 2
                ? "Gemini'ye gönderiliyor ve sonuçlar işleniyor..."
                : "PDF okunuyor..."}
            </p>

            <div className="flex items-center gap-2">
              {["PDF Okuma", "Gemini Analizi", "Sonuçlar"].map((asama, index) => (
                <div key={asama} className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full transition-colors ${
                      analizAsamasi > index ? "bg-cyan-400" : "bg-white/20"
                    }`}
                  />
                  {index < 2 && <div className="h-px w-6 bg-white/15" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className={`relative z-10 overflow-hidden px-6 py-10 ${sonuc ? "pb-24 lg:pb-10" : ""}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#0d7a8c33,transparent_38%),radial-gradient(circle_at_bottom_left,#0a5f6e2e,transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl">
          <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white p-4 shadow-xl">
                <img
                  src="/logoGeropital.png"
                  alt="Geropital Logo"
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-200">
                  Geropital Klinik Panel
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  Kan Tahlili Değerlendirme Sistemi
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Kurumsal laboratuvar analiz ve klinik ön değerlendirme paneli
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTema((t) => (t === "koyu" ? "acik" : "koyu"))}
                title={tema === "koyu" ? "Açık temaya geç" : "Koyu temaya geç"}
                className="focus-halka flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/10 text-lg backdrop-blur-md transition hover:scale-105"
              >
                {tema === "koyu" ? "🌙" : "☀️"}
              </button>

              <button
                type="button"
                onClick={() => setBuyukYazi((b) => !b)}
                title="Büyük yazı modu"
                aria-pressed={buyukYazi}
                className={`focus-halka flex h-10 items-center justify-center rounded-full border px-4 text-sm font-bold backdrop-blur-md transition hover:scale-105 ${
                  buyukYazi
                    ? "border-cyan-400 bg-cyan-400 text-slate-950"
                    : "border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                }`}
              >
                Büyük Yazı
              </button>

              <div className="w-fit rounded-full border border-cyan-300 dark:border-cyan-400/30 bg-cyan-100 dark:bg-cyan-400/10 px-5 py-2 text-sm font-medium text-cyan-800 dark:text-cyan-100">
                Kurum İçi Klinik Analiz
              </div>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <ParlakKart>
            <div className="h-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/10 p-8 shadow-2xl backdrop-blur-md">
              <div className="mb-6 inline-flex rounded-full bg-blue-50 dark:bg-blue-500/15 px-4 py-2 text-sm text-blue-700 dark:text-blue-200">
                PDF Yükle · Analiz Et · Rapor Oluştur
              </div>

              <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                Kan tahlili sonuçlarını sade, hızlı ve anlaşılır şekilde yorumlayın.
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Sistem, yüklenen laboratuvar PDF dosyasındaki değerleri referans
                aralıklarına göre normal, düşük, yüksek veya kritik olarak
                sınıflandırır. Sonuçlar kısa klinik yorumlar ve düzenlenebilir rapor
                alanlarıyla birlikte sunulur.
              </p>

              <div
                onDragOver={surukleBirakSurukleniyor}
                onDragLeave={surukleBirakAyrildi}
                onDrop={surukleBirakBirakildi}
                className={`mt-8 rounded-2xl border border-dashed p-8 text-center transition-colors ${
                  surukleniyorMu
                    ? "surukle-aktif border-cyan-400 bg-cyan-100/60 dark:bg-cyan-400/10"
                    : "border-cyan-300/40 bg-slate-100 dark:bg-slate-950/40 hover:border-cyan-300/70"
                }`}
              >
                <div className="deney-ikonu mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-400/10 text-3xl">
                  🧪
                </div>

                <h3 className="text-xl font-semibold">
                  Kan Tahlili PDF Dosyası Yükle
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  PDF dosyanızı seçin, buraya sürükleyip bırakın veya klinik ön
                  değerlendirmeyi başlatın.
                </p>

                <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-cyan-300 active:scale-[0.98]">
                  PDF Seç
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={dosyaSecildi}
                  />
                </label>

                {dosya && (
                  <div className="kart-belir mx-auto mt-6 max-w-xl rounded-2xl border border-cyan-300/20 bg-cyan-100 dark:bg-cyan-400/10 p-4 text-left">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Seçilen Dosya</p>
                    <p className="mt-1 break-all font-semibold text-cyan-800 dark:text-cyan-100">
                      {dosya.name}
                    </p>

                    <button
                      onClick={analiziBaslat}
                      disabled={yukleniyor}
                      className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {yukleniyor ? "Analiz Yapılıyor..." : "Analizi Başlat"}
                    </button>
                  </div>
                )}

                {hata && (
                  <div
                    key={hataAnahtari}
                    className="kart-belir hata-salla mx-auto mt-5 max-w-xl rounded-2xl border border-red-300/20 bg-red-50 dark:bg-red-500/10 p-4 text-left text-sm text-red-600 dark:text-red-200 whitespace-pre-wrap"
                  >
                    {hata}
                  </div>
                )}
              </div>
            </div>
            </ParlakKart>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-5 text-lg font-semibold">Analiz Akışı</h3>

                <div className="relative space-y-6 pl-2">
                  {/* Adımları birbirine bağlayan dikey çizgi */}
                  <div className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-cyan-400/60 via-cyan-400/25 to-transparent" />

                  {[
                    {
                      baslik: "PDF Okuma",
                      aciklama: "Laboratuvar PDF dosyasındaki değerler ayrıştırılır.",
                    },
                    {
                      baslik: "Referans Karşılaştırma",
                      aciklama: "Her parametre referans aralığına göre sınıflandırılır.",
                    },
                    {
                      baslik: "Rapor Düzenleme",
                      aciklama:
                        "Hasta bilgileri, klinik notlar ve uyarılar gönderim öncesi düzenlenebilir.",
                    },
                  ].map((adim, index) => (
                    <div key={adim.baslik} className="relative flex gap-4">
                      <div
                        className="adim-rozet relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950"
                        style={{ animationDelay: `${index * 0.5}s` }}
                      >
                        {index + 1}
                      </div>
                      <div className="pt-0.5">
                        <p className="font-medium text-cyan-700 dark:text-cyan-200">{adim.baslik}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{adim.aciklama}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {sonuc && (
            <section className="sonuc-fade-in mt-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/10 p-6 shadow-2xl backdrop-blur-md">
              <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-cyan-700 dark:text-cyan-200">Analiz Sonucu</p>
                  <h2 className="mt-1 text-3xl font-bold">
                    Kan Tahlili Klinik Ön Değerlendirmesi
                  </h2>

                  <div className="mt-3">
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                      PDF Şablonu
                    </p>
                    <div className="inline-flex rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950/50 p-1">
                      <button
                        type="button"
                        onClick={() => setSablon("modern")}
                        className={`focus-halka rounded-xl px-4 py-2 text-sm font-medium transition ${
                          sablon === "modern"
                            ? "bg-cyan-400 text-slate-950"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Modern (Tablolu)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSablon("klasik")}
                        className={`focus-halka rounded-xl px-4 py-2 text-sm font-medium transition ${
                          sablon === "klasik"
                            ? "bg-cyan-400 text-slate-950"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Klasik (Resmi Rapor)
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      {sablon === "modern"
                        ? "İkonlu, renkli, tablo düzeninde kurumsal rapor."
                        : "Antetli, numaralı başlıklı, madde madde resmi Geropital formatı."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={pdfOlustur}
                    disabled={pdfHazirlaniyor}
                    className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {pdfHazirlaniyor ? "PDF Hazırlanıyor..." : "PDF Oluştur"}
                  </button>

                  <button
                    onClick={whatsaptanGonder}
                    title="Önce PDF Oluştur'a basıp dosyayı indirin, ardından açılan WhatsApp sohbetine ekleyin"
                    className="focus-halka rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition hover:scale-[1.03] hover:bg-emerald-500/25"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Sayarak beliren özet rakamları - ekranda dağılımı bir
                  bakışta görmek için (PDF'e bakmaya gerek kalmadan). */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { etiket: "Toplam", deger: sonuc.ozet?.toplamParametre || 0, renk: "text-slate-900 dark:text-white" },
                  { etiket: "Normal", deger: sonuc.ozet?.normalSayisi || 0, renk: "text-emerald-600 dark:text-emerald-300" },
                  { etiket: "Düşük", deger: sonuc.ozet?.dusukSayisi || 0, renk: "text-sky-600 dark:text-sky-300" },
                  { etiket: "Yüksek", deger: sonuc.ozet?.yuksekSayisi || 0, renk: "text-orange-600 dark:text-orange-300" },
                  { etiket: "Kritik", deger: sonuc.ozet?.kritikSayisi || 0, renk: "text-red-600 dark:text-red-300" },
                ].map((istatistik, index) => (
                  <div
                    key={istatistik.etiket}
                    className="kart-belir rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950/70 p-4 text-center backdrop-blur-md transition hover:border-cyan-300/30"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <p className={`text-2xl font-bold tabular-nums ${istatistik.renk}`}>
                      <SayiSayaci hedef={istatistik.deger} />
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{istatistik.etiket}</p>
                  </div>
                ))}
              </div>

              {/* Kritik değer varsa, hastaya göndermeden önce staff'ı uyar. */}
              {kritikVarMi && (
                <div className="kritik-banner mb-6 flex items-start gap-3 rounded-2xl border border-red-300 dark:border-red-400/40 bg-red-100 dark:bg-red-500/25 p-4 backdrop-blur-md">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-100">
                      Bu raporda {sonuc.ozet.kritikSayisi} kritik değer var.
                    </p>
                    <p className="mt-1 text-sm text-red-600/90 dark:text-red-200/90">
                      Hastaya veya hasta yakınına göndermeden önce kritik
                      değerleri ve genel değerlendirmeyi mutlaka gözden geçirin.
                    </p>
                  </div>
                </div>
              )}

              {/* --- Hasta Bilgileri (düzenlenebilir) --- */}
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-cyan-800 dark:text-cyan-100">
                  Hasta Bilgileri
                </h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  PDF içinden otomatik okunur; hatalı ya da eksikse hastaya
                  göndermeden önce burada düzeltebilirsiniz.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Ad Soyad</label>
                    <input
                      value={sonuc.hastaBilgisi.adSoyad}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("adSoyad", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">TC Kimlik</label>
                    <input
                      value={sonuc.hastaBilgisi.tcKimlik}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("tcKimlik", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Yaş</label>
                    <input
                      value={sonuc.hastaBilgisi.yas}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("yas", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cinsiyet</label>
                    <input
                      value={sonuc.hastaBilgisi.cinsiyet}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("cinsiyet", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Rapor Tarihi</label>
                    <input
                      value={sonuc.hastaBilgisi.raporTarihi}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("raporTarihi", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                      WhatsApp Telefonu{" "}
                      <span className="text-slate-400 dark:text-slate-500">(opsiyonel)</span>
                    </label>
                    <input
                      value={whatsappTelefon}
                      onChange={(e) => setWhatsappTelefon(e.target.value)}
                      placeholder="905XXXXXXXXX"
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/40 focus-halka"
                    />
                  </div>
                </div>
              </div>

              {/* --- Rapor İçeriği (düzenlenebilir) --- */}
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-cyan-800 dark:text-cyan-100">
                  Rapor İçeriği
                </h3>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">
                      Genel Değerlendirme
                    </label>
                    <textarea
                      value={sonuc.genelDegerlendirme}
                      onChange={(event) =>
                        sonucAlaniGuncelle("genelDegerlendirme", event.target.value)
                      }
                      className="h-40 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">
                      Tedavi ve Takip Notları
                    </label>
                    <textarea
                      value={listeMetneCevir(sonuc.tedaviNotlari)}
                      onChange={(event) =>
                        sonucAlaniGuncelle(
                          "tedaviNotlari",
                          metniListeyeCevir(event.target.value)
                        )
                      }
                      className="h-40 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">
                      Uyarı Mesajı{" "}
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        (PDF'in altında hasta için görünür)
                      </span>
                    </label>
                    <textarea
                      value={sonuc.uyariMesaji}
                      onChange={(event) =>
                        sonucAlaniGuncelle("uyariMesaji", event.target.value)
                      }
                      className="h-20 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                    />
                  </div>
                </div>
              </div>

              {/* --- Değerlendiren --- */}
              <div className="mb-6 max-w-sm">
                <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">
                  Değerlendiren Personel / Hekim{" "}
                  <span className="text-xs text-slate-400 dark:text-slate-500">(opsiyonel)</span>
                </label>
                <input
                  value={sonuc.degerlendirenKisi || ""}
                  onChange={(event) =>
                    sonucAlaniGuncelle("degerlendirenKisi", event.target.value)
                  }
                  placeholder="Örn. Hem. Ayşe Yılmaz"
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 focus-halka"
                />
              </div>

              {/* --- Gelişmiş Rapor Editörü (katlanabilir) --- */}
              <div className="mb-6 rounded-2xl border border-cyan-300/30 dark:border-cyan-400/20 bg-cyan-50/50 dark:bg-cyan-400/5">
                <button
                  onClick={() => setEditorAcik((a) => !a)}
                  className="focus-halka flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span>
                    <span className="flex items-center gap-2 text-base font-semibold text-cyan-700 dark:text-cyan-100">
                      <span className="text-lg">🧬</span> Gelişmiş Rapor Editörü
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      Parametreleri tek tek düzenleyin, satır ekleyin/silin, rapora
                      başlık, not, vurgu kutusu, değer çubuğu ve liste ekleyin.
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-cyan-400/20 px-3 py-1.5 text-sm font-medium text-cyan-700 dark:text-cyan-200">
                    {editorAcik ? "Kapat ▲" : "Aç ▼"}
                  </span>
                </button>

                {editorAcik && (
                  <div className="border-t border-cyan-300/30 dark:border-cyan-400/20 p-5">
                    <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
                      {/* SOL: dar, kaydırılabilir düzenleme paneli */}
                      <div className="min-w-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2">
                        <RaporEditoru sonuc={sonuc} setSonuc={setSonuc} />
                      </div>

                      {/* SAĞ: büyük, baskın canlı önizleme */}
                      <div className="min-w-0">
                        <div className="lg:sticky lg:top-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-100">
                                Canlı Önizleme
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {sablon === "modern"
                                  ? "Modern (Tablolu) şablon"
                                  : "Klasik (Resmi Rapor) şablon"}{" "}
                                · indireceğiniz PDF ile birebir aynı
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={pdfOlustur}
                                disabled={pdfHazirlaniyor}
                                className="focus-halka rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {pdfHazirlaniyor ? "Hazırlanıyor..." : "PDF İndir"}
                              </button>
                              <button
                                onClick={whatsaptanGonder}
                                title="Önce PDF İndir'e basın, sonra açılan WhatsApp sohbetine ekleyin"
                                className="focus-halka rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-500/25"
                              >
                                WhatsApp
                              </button>
                            </div>
                          </div>

                          <div className="h-[calc(100vh-160px)] min-h-[640px]">
                            <CanliOnizleme sonuc={sonuc} sablon={sablon} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6 flex flex-col gap-3 md:flex-row">
                <input
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="Parametre veya kategori ara..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 focus-halka"
                />

                <select
                  value={durumFiltresi}
                  onChange={(e) => setDurumFiltresi(e.target.value as FiltreDurumu)}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka"
                >
                  <option value="tum">Tüm Değerler</option>
                  <option value="normal">Normal</option>
                  <option value="dusuk">Düşük</option>
                  <option value="yuksek">Yüksek</option>
                  <option value="kritik">Kritik</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtrelenmisParametreler.map((item: Parametre, index: number) => {
                  const stil = durumStilleri[item.durum] || durumStilleri.normal;

                  return (
                    <div
                      key={index}
                      className={`kart-belir rounded-2xl border p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 ${stil.kart}`}
                      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <KategoriRozeti kategori={item.kategori || "Diğer"} />
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.kategori || "Diğer"}
                            </p>
                            <h3 className="mt-1 text-xl font-bold">{item.parametre}</h3>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${stil.rozet}`}
                        >
                          {stil.etiket}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-xl bg-slate-100 dark:bg-slate-950/35 p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Sonuç</p>
                          <p className="mt-1 text-lg font-semibold">
                            {item.deger} {item.birim}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 dark:bg-slate-950/35 p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Referans Aralığı</p>
                          <p className="mt-1 text-sm font-medium">
                            {item.referans || "Belirtilmemiş"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 dark:bg-slate-950/35 p-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {item.yorum}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </section>

      {/* Mobilde/tablette sonuç varken PDF butonuna ulaşmak için sürekli
          yukarı kaydırmaya gerek kalmasın diye ekranın altına sabitlenmiş
          kısayol çubuğu (yalnızca küçük ekranlarda görünür). */}
      {sonuc && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 p-3 backdrop-blur-md lg:hidden">
          <button
            onClick={pdfOlustur}
            disabled={pdfHazirlaniyor}
            className="focus-halka flex-1 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pdfHazirlaniyor ? "Hazırlanıyor..." : "PDF Oluştur"}
          </button>
          <button
            onClick={whatsaptanGonder}
            className="focus-halka rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
          >
            WhatsApp
          </button>
        </div>
      )}

      {/* PDF başarıyla indiğinde kısa süreliğine görünen onay toast'ı. */}
      {pdfBasariToastu && (
        <div className="toast-gir fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-slate-900/95 px-5 py-4 text-white shadow-2xl backdrop-blur-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20 text-lg text-emerald-300">
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold">PDF indirildi</p>
            <p className="text-xs text-slate-400">Rapor cihazınıza kaydedildi.</p>
          </div>
        </div>
      )}
    </main>
  );
}