"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnalizSonucu, Durum, HastaBilgisi, Parametre } from "./types/kanTahlili";

type FiltreDurumu = "tum" | Durum;

const durumStilleri = {
  normal: {
    etiket: "Normal",
    kart: "border-emerald-300/20 bg-emerald-400/10",
    rozet: "border-emerald-300/20 bg-emerald-400/15 text-emerald-200",
  },
  dusuk: {
    etiket: "Düşük",
    kart: "border-sky-300/20 bg-sky-400/10",
    rozet: "border-sky-300/20 bg-sky-400/15 text-sky-200",
  },
  yuksek: {
    etiket: "Yüksek",
    kart: "border-orange-300/25 bg-orange-400/10",
    rozet: "border-orange-300/20 bg-orange-400/15 text-orange-200",
  },
  kritik: {
    etiket: "Kritik",
    kart: "border-red-300/30 bg-red-400/10",
    rozet: "border-red-300/20 bg-red-400/15 text-red-200",
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
  const kopyaSayisi = 7;

  return (
    <div
      className={ters ? "dna-serit-yukari" : "dna-serit-asagi"}
      style={{ animationDuration: `${sure}s` }}
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

// Marka rengi (turkuaz) etrafında toplanan, birbiriyle uyumlu, SOLUK bir
// renk ailesi. Önceki sürümdeki 8 parlak/doygun renk metinle okunabilirlik
// açısından yarışıyordu; burada aynı renk hissi korunuyor ama parlaklık
// ve doygunluk düşürüldü (pastel ton), sütun sayısı da azaltıldı.
const DNA_RENK_PALETI: [string, string][] = [
  ["#67e8f9", "#38bdf8"], // camgöbeği - mavi (marka rengi)
  ["#a5b4fc", "#93c5fd"], // indigo - açık mavi
  ["#5eead4", "#2dd4bf"], // turkuaz
  ["#c4b5fd", "#a78bfa"], // açık mor
  ["#7dd3fc", "#67e8f9"], // gökyüzü - camgöbeği
];

// Artık sadece kenarlarda değil, tüm sayfa genişliğine yayılmış, ama
// GÖZ YORMAYACAK kadar soluk, dekoratif bir arka plan. z-0 + main'in
// "relative" olması sayesinde main'in arka plan renginin ÜSTÜNDE, gerçek
// içeriğin ALTINDA katmanlanır. `aktif=false` iken (örn. analiz sürerken,
// ağır bir blur efektli yükleniyor ekranı zaten açıkken) hiç render
// edilmez - iki ağır efekt aynı anda çalışıp tarayıcıyı zorlamasın diye.
function DnaArkaplan({ aktif }: { aktif: boolean }) {
  if (!aktif) return null;

  return (
    <div
      aria-hidden
      className="dna-arkaplan pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.13]"
    >
      <div className="grid h-full grid-flow-col auto-cols-fr gap-5 px-2 sm:gap-8 lg:gap-10">
        {DNA_RENK_PALETI.map(([renk1, renk2], i) => (
          <DnaSeridi
            key={i}
            renk1={renk1}
            renk2={renk2}
            ters={i % 2 === 1}
            sure={36 + (i % 3) * 8}
          />
        ))}
      </div>
    </div>
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

export default function AnaSayfa() {
  const [dosya, setDosya] = useState<File | null>(null);
  const [sonuc, setSonuc] = useState<AnalizSonucu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [arama, setArama] = useState("");
  const [durumFiltresi, setDurumFiltresi] = useState<FiltreDurumu>("tum");
  const [geciciApiKey, setGeciciApiKey] = useState("");
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false);

  function dosyaSecildi(event: React.ChangeEvent<HTMLInputElement>) {
    const secilenDosya = event.target.files?.[0];

    if (!secilenDosya) return;

    setDosya(secilenDosya);
    setSonuc(null);
    setHata("");
    setArama("");
    setDurumFiltresi("tum");
  }

  async function analiziBaslat() {
    if (!dosya) {
      setHata("Lütfen önce bir PDF dosyası seçin.");
      return;
    }

    try {
      setYukleniyor(true);
      setHata("");
      setSonuc(null);

      const formData = new FormData();
      formData.append("dosya", dosya);

      const cevap = await fetch("/api/kan-tahlili-analiz", {
        method: "POST",
        headers: geciciApiKey ? { "x-gemini-api-key": geciciApiKey } : undefined,
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

      setSonuc(veri);
    } catch (error: any) {
      setHata(error.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setYukleniyor(false);
      setIsUpdatingApiKey(false);
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
        body: JSON.stringify(sonuc),
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
    } catch (error: any) {
      setHata(error.message || "PDF oluşturulurken bir hata oluştu.");
    } finally {
      setPdfHazirlaniyor(false);
    }
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
    <main className="relative min-h-screen bg-[#07111f] text-white">
      <DnaArkaplan aktif={!yukleniyor && !isUpdatingApiKey} />
      {(yukleniyor || isUpdatingApiKey) && (
        <div className="analiz-yukleniyor-kaplama">
          <div className="analiz-yukleniyor-kart">
            <img
              src="/logoGeropital.png"
              alt="Geropital Logo"
              className="analiz-yukleniyor-logo"
            />

            <div className="daktilo-yazi">GEROPITAL</div>

            <p>
              {isUpdatingApiKey
                ? "API Anahtarı Güncelleniyor..."
                : "Kan tahlili analiz ediliyor..."}
            </p>
          </div>
        </div>
      )}

      <section className="relative z-10 overflow-hidden px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1e3a8a55,transparent_35%),radial-gradient(circle_at_bottom_left,#0ea5e955,transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl">
          <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-3xl border border-white/10 bg-white p-4 shadow-xl">
                <img
                  src="/logoGeropital.png"
                  alt="Geropital Logo"
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Geropital Klinik Panel
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  Kan Tahlili Değerlendirme Sistemi
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Kurumsal laboratuvar analiz ve klinik ön değerlendirme paneli
                </p>
              </div>
            </div>

            <div className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 text-sm font-medium text-cyan-100">
              Kurum İçi Klinik Analiz
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <ParlakKart>
            <div className="h-full rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
              <div className="mb-6 inline-flex rounded-full bg-blue-500/15 px-4 py-2 text-sm text-blue-200">
                PDF Yükle · Analiz Et · Rapor Oluştur
              </div>

              <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                Kan tahlili sonuçlarını sade, hızlı ve anlaşılır şekilde yorumlayın.
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Sistem, yüklenen laboratuvar PDF dosyasındaki değerleri referans
                aralıklarına göre normal, düşük, yüksek veya kritik olarak
                sınıflandırır. Sonuçlar kısa klinik yorumlar ve düzenlenebilir rapor
                alanlarıyla birlikte sunulur.
              </p>

              <div className="mt-8 rounded-2xl border border-dashed border-cyan-300/40 bg-slate-950/40 p-8 text-center transition-colors hover:border-cyan-300/70">
                <div className="deney-ikonu mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl">
                  🧪
                </div>

                <h3 className="text-xl font-semibold">
                  Kan Tahlili PDF Dosyası Yükle
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  PDF dosyanızı seçin ve klinik ön değerlendirmeyi başlatın.
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
                  <div className="kart-belir mx-auto mt-6 max-w-xl rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-left">
                    <p className="text-sm text-slate-400">Seçilen Dosya</p>
                    <p className="mt-1 break-all font-semibold text-cyan-100">
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
                  <div className="kart-belir mx-auto mt-5 max-w-xl rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-left text-sm text-red-200 whitespace-pre-wrap">
                    {hata}
                  </div>
                )}
              </div>
            </div>
            </ParlakKart>

            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-3 text-lg font-semibold">API Anahtarı</h3>

                <p className="mb-4 text-sm leading-6 text-slate-400">
                  Kota dolarsa geçici Gemini API anahtarını buraya girerek analize devam edebilirsiniz.
                </p>

                <div className="flex gap-3">
                  <input
                    type="password"
                    value={geciciApiKey}
                    onChange={(event) => setGeciciApiKey(event.target.value)}
                    placeholder="Geçici Gemini API anahtarı"
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!geciciApiKey.trim()) {
                        setHata("Lütfen bir API anahtarı girin.");
                        return;
                      }
                      if (!dosya) {
                        setHata("Lütfen bir PDF dosyası seçin.");
                        return;
                      }
                      setIsUpdatingApiKey(true);
                      analiziBaslat();
                    }}
                    disabled={yukleniyor || isUpdatingApiKey || !geciciApiKey.trim()}
                    className="rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-600 hover:to-cyan-700"
                  >
                    {isUpdatingApiKey ? "Güncelleniyor..." : yukleniyor ? "Analiz Ediliyor..." : "Bağlan"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
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
                        <p className="font-medium text-cyan-200">{adim.baslik}</p>
                        <p className="mt-1 text-sm text-slate-400">{adim.aciklama}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {sonuc && (
            <section className="sonuc-fade-in mt-10 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
              <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-cyan-200">Analiz Sonucu</p>
                  <h2 className="mt-1 text-3xl font-bold">
                    Kan Tahlili Klinik Ön Değerlendirmesi
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Rapor formatı:{" "}
                    <span className="font-semibold text-cyan-200">
                      Kompakt Klinik Rapor
                    </span>
                  </p>
                </div>

                <button
                  onClick={pdfOlustur}
                  disabled={pdfHazirlaniyor}
                  className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {pdfHazirlaniyor ? "PDF Hazırlanıyor..." : "PDF Oluştur"}
                </button>
              </div>

              {/* Sayarak beliren özet rakamları - ekranda dağılımı bir
                  bakışta görmek için (PDF'e bakmaya gerek kalmadan). */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { etiket: "Toplam", deger: sonuc.ozet?.toplamParametre || 0, renk: "text-white" },
                  { etiket: "Normal", deger: sonuc.ozet?.normalSayisi || 0, renk: "text-emerald-300" },
                  { etiket: "Düşük", deger: sonuc.ozet?.dusukSayisi || 0, renk: "text-sky-300" },
                  { etiket: "Yüksek", deger: sonuc.ozet?.yuksekSayisi || 0, renk: "text-orange-300" },
                  { etiket: "Kritik", deger: sonuc.ozet?.kritikSayisi || 0, renk: "text-red-300" },
                ].map((istatistik, index) => (
                  <div
                    key={istatistik.etiket}
                    className="kart-belir rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-center backdrop-blur-md transition hover:border-cyan-300/30"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <p className={`text-2xl font-bold tabular-nums ${istatistik.renk}`}>
                      <SayiSayaci hedef={istatistik.deger} />
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{istatistik.etiket}</p>
                  </div>
                ))}
              </div>

              {/* Kritik değer varsa, hastaya göndermeden önce staff'ı uyar. */}
              {kritikVarMi && (
                <div className="kritik-banner mb-6 flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/25 p-4 backdrop-blur-md">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-100">
                      Bu raporda {sonuc.ozet.kritikSayisi} kritik değer var.
                    </p>
                    <p className="mt-1 text-sm text-red-200/90">
                      Hastaya veya hasta yakınına göndermeden önce kritik
                      değerleri ve genel değerlendirmeyi mutlaka gözden geçirin.
                    </p>
                  </div>
                </div>
              )}

              {/* --- Hasta Bilgileri (düzenlenebilir) --- */}
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-cyan-100">
                  Hasta Bilgileri
                </h3>
                <p className="mb-3 text-xs text-slate-400">
                  PDF içinden otomatik okunur; hatalı ya da eksikse hastaya
                  göndermeden önce burada düzeltebilirsiniz.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-xs text-slate-400">Ad Soyad</label>
                    <input
                      value={sonuc.hastaBilgisi.adSoyad}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("adSoyad", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">TC Kimlik</label>
                    <input
                      value={sonuc.hastaBilgisi.tcKimlik}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("tcKimlik", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Yaş</label>
                    <input
                      value={sonuc.hastaBilgisi.yas}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("yas", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Cinsiyet</label>
                    <input
                      value={sonuc.hastaBilgisi.cinsiyet}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("cinsiyet", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1 block text-xs text-slate-400">Rapor Tarihi</label>
                    <input
                      value={sonuc.hastaBilgisi.raporTarihi}
                      onChange={(e) => hastaBilgisiAlaniGuncelle("raporTarihi", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>
                </div>
              </div>

              {/* --- Rapor İçeriği (düzenlenebilir) --- */}
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-cyan-100">
                  Rapor İçeriği
                </h3>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Genel Değerlendirme
                    </label>
                    <textarea
                      value={sonuc.genelDegerlendirme}
                      onChange={(event) =>
                        sonucAlaniGuncelle("genelDegerlendirme", event.target.value)
                      }
                      className="h-40 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
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
                      className="h-40 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">
                      Uyarı Mesajı{" "}
                      <span className="text-xs text-slate-500">
                        (PDF'in altında hasta için görünür)
                      </span>
                    </label>
                    <textarea
                      value={sonuc.uyariMesaji}
                      onChange={(event) =>
                        sonucAlaniGuncelle("uyariMesaji", event.target.value)
                      }
                      className="h-20 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </div>
                </div>
              </div>

              {/* --- Değerlendiren --- */}
              <div className="mb-6 max-w-sm">
                <label className="mb-2 block text-sm text-slate-300">
                  Değerlendiren Personel / Hekim{" "}
                  <span className="text-xs text-slate-500">(opsiyonel)</span>
                </label>
                <input
                  value={sonuc.degerlendirenKisi || ""}
                  onChange={(event) =>
                    sonucAlaniGuncelle("degerlendirenKisi", event.target.value)
                  }
                  placeholder="Örn. Hem. Ayşe Yılmaz"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </div>

              <div className="mb-6 flex flex-col gap-3 md:flex-row">
                <input
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="Parametre veya kategori ara..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
                />

                <select
                  value={durumFiltresi}
                  onChange={(e) => setDurumFiltresi(e.target.value as FiltreDurumu)}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
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
                        <div>
                          <p className="text-xs text-slate-400">
                            {item.kategori || "Diğer"}
                          </p>
                          <h3 className="mt-1 text-xl font-bold">{item.parametre}</h3>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${stil.rozet}`}
                        >
                          {stil.etiket}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-xl bg-slate-950/35 p-3">
                          <p className="text-xs text-slate-400">Sonuç</p>
                          <p className="mt-1 text-lg font-semibold">
                            {item.deger} {item.birim}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950/35 p-3">
                          <p className="text-xs text-slate-400">Referans Aralığı</p>
                          <p className="mt-1 text-sm font-medium">
                            {item.referans || "Belirtilmemiş"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950/35 p-3 text-sm leading-6 text-slate-200">
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
    </main>
  );
}