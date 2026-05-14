"use client";

import { useMemo, useState } from "react";

type Durum = "tum" | "normal" | "dusuk" | "yuksek" | "kritik";
type RaporTipi = "klinik" | "ozet";

type HastaBilgisi = {
  adSoyad: string;
  tcKimlik: string;
  yas: string;
  cinsiyet: string;
  raporTarihi: string;
};

type Ozet = {
  toplamParametre: number;
  normalSayisi: number;
  dusukSayisi: number;
  yuksekSayisi: number;
  kritikSayisi: number;
};

type Parametre = {
  parametre: string;
  deger: string;
  referans: string;
  birim: string;
  durum: Exclude<Durum, "tum">;
  kategori: string;
  yorum: string;
};

type AnalizSonucu = {
  hastaBilgisi: HastaBilgisi;
  ozet: Ozet;
  parametreler: Parametre[];
  genelDegerlendirme: string;
  degerlendirmeMaddeleri: string[];
  tedaviNotlari: string[];
  ekNot: string;
  uyariMesaji: string;
};

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

function durumYazi(durum: string) {
  if (durum === "normal") return "Normal";
  if (durum === "dusuk") return "Düşük";
  if (durum === "yuksek") return "Yüksek";
  if (durum === "kritik") return "Kritik";
  return "Belirsiz";
}

function kategoriBasligiGosterilmeliMi(
  tumParametreler: Parametre[],
  mevcutIndex: number
) {
  if (mevcutIndex === 0) return true;

  const mevcut = tumParametreler[mevcutIndex];
  const onceki = tumParametreler[mevcutIndex - 1];

  return mevcut.kategori !== onceki.kategori;
}

function durumPdfSinifi(durum: string) {
  if (durum === "normal") return "pdf-durum-normal";
  if (durum === "dusuk") return "pdf-durum-dusuk";
  if (durum === "yuksek") return "pdf-durum-yuksek";
  if (durum === "kritik") return "pdf-durum-kritik";
  return "";
}

function listeMetneCevir(liste: string[]) {
  return Array.isArray(liste) ? liste.join("\n") : "";
}

function metniListeyeCevir(metin: string) {
  return metin
    .split("\n")
    .map((satir) => satir.trim())
    .filter(Boolean);
}

function parcalaraAyir<T>(liste: T[], parcaBoyutu: number) {
  const parcalar: T[][] = [];

  for (let i = 0; i < liste.length; i += parcaBoyutu) {
    parcalar.push(liste.slice(i, i + parcaBoyutu));
  }

  return parcalar;
}

function dosyaAdiTemizle(metin: string) {
  return metin
    .replace(/[ğ]/g, "g")
    .replace(/[Ğ]/g, "G")
    .replace(/[ü]/g, "u")
    .replace(/[Ü]/g, "U")
    .replace(/[ş]/g, "s")
    .replace(/[Ş]/g, "S")
    .replace(/[ı]/g, "i")
    .replace(/[İ]/g, "I")
    .replace(/[ö]/g, "o")
    .replace(/[Ö]/g, "O")
    .replace(/[ç]/g, "c")
    .replace(/[Ç]/g, "C")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfDosyaAdiOlustur(sonuc: AnalizSonucu) {
  const hastaAdi = sonuc.hastaBilgisi?.adSoyad || "Hasta";
  const tarih =
    sonuc.hastaBilgisi?.raporTarihi || new Date().toLocaleDateString("tr-TR");

  const temizTarih = tarih.replace(/[\/.]]/g, "-");

  return dosyaAdiTemizle(
    `${hastaAdi} Kan Tahlili Sonuclari ${temizTarih}`
  );
}

function kategorilereGoreGrupla(parametreler: Parametre[]) {
  const gruplar: Record<string, Parametre[]> = {};

  parametreler.forEach((item) => {
    const kategori = item.kategori || "Diğer";

    if (!gruplar[kategori]) {
      gruplar[kategori] = [];
    }

    gruplar[kategori].push(item);
  });

  return gruplar;
}

export default function AnaSayfa() {
  const [dosya, setDosya] = useState<File | null>(null);
  const [sonuc, setSonuc] = useState<AnalizSonucu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [arama, setArama] = useState("");
  const [durumFiltresi, setDurumFiltresi] = useState<Durum>("tum");
  const [geciciApiKey, setGeciciApiKey] = useState("");
  
  const raporTipi: RaporTipi = "klinik";

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
        headers: geciciApiKey
          ? {
              "x-gemini-api-key": geciciApiKey,
            }
          : undefined,
        body: formData,
      });

      const veri = await cevap.json();

      if (!cevap.ok) {
        throw new Error(
          veri.detay
            ? `${veri.hata} Detay: ${veri.detay}`
            : veri.hata || "Analiz sırasında bir hata oluştu."
        );
      }

      setSonuc(veri);
    } catch (error: any) {
      setHata(error.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setYukleniyor(false);
    }
  }

  function pdfOlustur() {
    if (!sonuc) return;

    setPdfHazirlaniyor(true);

    const eskiBaslik = document.title;
    document.title = pdfDosyaAdiOlustur(sonuc);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        document.title = eskiBaslik;
        setPdfHazirlaniyor(false);
      }, 700);
    }, 300);
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

  const pdfParametreler = useMemo(() => {
    if (!sonuc?.parametreler) return [];

    const oncelik = {
      kritik: 1,
      yuksek: 2,
      dusuk: 3,
      normal: 4,
    };

    return [...sonuc.parametreler].sort(
      (a, b) => oncelik[a.durum] - oncelik[b.durum]
    );
  }, [sonuc]);

  const pdfSayfalari = useMemo(() => {
    if (pdfParametreler.length === 0) return [];

    const ilkSayfaLimiti = 15;
    const devamSayfaLimiti = 19;

    const ilkSayfa = pdfParametreler.slice(0, ilkSayfaLimiti);
    const kalanlar = pdfParametreler.slice(ilkSayfaLimiti);

    return [ilkSayfa, ...parcalaraAyir(kalanlar, devamSayfaLimiti)];
  }, [pdfParametreler]);

  const kategorilereGoreGrupla = (parametreler: Parametre[]) => {
    const gruplar: Record<string, Parametre[]> = {};

    parametreler.forEach((item) => {
      const kategori = item.kategori || "Diğer";

      if (!gruplar[kategori]) {
        gruplar[kategori] = [];
      }

      gruplar[kategori].push(item);
    });

    return gruplar;
  };

  const referansDisiParametreler = useMemo(() => {
    return pdfParametreler.filter((item) => item.durum !== "normal");
  }, [pdfParametreler]);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      {yukleniyor && (
        <div className="analiz-yukleniyor-kaplama">
          <div className="analiz-yukleniyor-kart">
            <img
              src="/logoGeropital.png"
              alt="Geropital Logo"
              className="analiz-yukleniyor-logo"
            />

            <div className="daktilo-yazi">
              GEROPITAL
            </div>

            <p>
              Kan tahlili analiz ediliyor...
            </p>
          </div>
        </div>
      )}
      <section className="ekran-alani relative overflow-hidden px-6 py-10">
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
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
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

              <div className="mt-8 rounded-2xl border border-dashed border-cyan-300/40 bg-slate-950/40 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl">
                  🧪
                </div>

                <h3 className="text-xl font-semibold">
                  Kan Tahlili PDF Dosyası Yükle
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  PDF dosyanızı seçin ve klinik ön değerlendirmeyi başlatın.
                </p>

                <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                  PDF Seç
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={dosyaSecildi}
                  />
                </label>

                {dosya && (
                  <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-left">
                    <p className="text-sm text-slate-400">Seçilen Dosya</p>
                    <p className="mt-1 break-all font-semibold text-cyan-100">
                      {dosya.name}
                    </p>

                    <button
                      onClick={analiziBaslat}
                      disabled={yukleniyor}
                      className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {yukleniyor ? "Analiz Yapılıyor..." : "Analizi Başlat"}
                    </button>
                  </div>
                )}

                {hata && (
                  <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
                    {hata}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
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
                      if (!dosya) {
                        setHata("Lütfen önce bir PDF dosyası seçin.");
                        return;
                      }
                      if (!geciciApiKey.trim()) {
                        setHata("Lütfen bir API anahtarı girin.");
                        return;
                      }
                      analiziBaslat();
                    }}
                    disabled={yukleniyor || !dosya || !geciciApiKey.trim()}
                    className="rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-600 hover:to-cyan-700"
                  >
                    {yukleniyor ? "Analiz Ediliyor..." : "Bağlan"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                <h3 className="mb-4 text-lg font-semibold">Analiz Akışı</h3>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-950/40 p-4">
                    <p className="font-medium text-cyan-200">1. PDF Okuma</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Laboratuvar PDF dosyasındaki değerler ayrıştırılır.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/40 p-4">
                    <p className="font-medium text-cyan-200">
                      2. Referans Karşılaştırma
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Her parametre referans aralığına göre sınıflandırılır.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/40 p-4">
                    <p className="font-medium text-cyan-200">
                      3. Rapor Düzenleme
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Genel değerlendirme, tedavi notları ve ek notlar düzenlenebilir.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {sonuc && (
            <section className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-cyan-200">Analiz Sonucu</p>
                  <h2 className="mt-1 text-3xl font-bold">
                    Kan Tahlili Klinik Ön Değerlendirmesi
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Seçili rapor formatı:{" "}
                    <span className="font-semibold text-cyan-200">
                      {raporTipi === "klinik"
                        ? "Kompakt Klinik Rapor"
                        : "Kurumsal Özet Rapor"}
                    </span>
                  </p>
                </div>

                <button
                  onClick={pdfOlustur}
                  disabled={pdfHazirlaniyor}
                  className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfHazirlaniyor ? "PDF Hazırlanıyor..." : "PDF Oluştur"}
                </button>
              </div>

              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Genel Değerlendirme
                  </label>
                  <textarea
                    value={sonuc.genelDegerlendirme}
                    onChange={(event) =>
                      sonucAlaniGuncelle("genelDegerlendirme", event.target.value)
                    }
                    className="h-36 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Değerlendirme Maddeleri
                  </label>
                  <textarea
                    value={listeMetneCevir(sonuc.degerlendirmeMaddeleri)}
                    onChange={(event) =>
                      sonucAlaniGuncelle(
                        "degerlendirmeMaddeleri",
                        metniListeyeCevir(event.target.value)
                      )
                    }
                    className="h-36 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Tedavi Notları
                  </label>
                  <textarea
                    value={listeMetneCevir(sonuc.tedaviNotlari)}
                    onChange={(event) =>
                      sonucAlaniGuncelle(
                        "tedaviNotlari",
                        metniListeyeCevir(event.target.value)
                      )
                    }
                    className="h-36 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Ek Not
                  </label>
                  <textarea
                    value={sonuc.ekNot}
                    onChange={(event) =>
                      sonucAlaniGuncelle("ekNot", event.target.value)
                    }
                    className="h-36 w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
                  />
                </div>
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
                  onChange={(e) => setDurumFiltresi(e.target.value as Durum)}
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
                {filtrelenmisParametreler.map((item, index) => {
                  const stil =
                    durumStilleri[item.durum] || durumStilleri.normal;

                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border p-5 ${stil.kart}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-400">
                            {item.kategori || "Diğer"}
                          </p>
                          <h3 className="mt-1 text-xl font-bold">
                            {item.parametre}
                          </h3>
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
                          <p className="text-xs text-slate-400">
                            Referans Aralığı
                          </p>
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

      {sonuc && (
        <section className="pdf-rapor-alani">
          {pdfSayfalari.map((sayfaParametreleri, sayfaIndex) => (
            <div className="pdf-sayfa" key={sayfaIndex}>
              {sayfaIndex === 0 ? (
                <>
                  <header className="pdf-header">
                    <div className="pdf-logo-alani">
                      <img src="/logoGeropital.png" alt="Geropital Logo" />
                    </div>

                    <div className="pdf-baslik-alani">
                      <p>Geropital Klinik Analiz Paneli</p>
                      <h1>
                        {raporTipi === "klinik"
                          ? "Kan Tahlili Değerlendirmesi"
                          : "Kan Tahlili Kurumsal Özet Raporu"}
                      </h1>
                      <span>
                        {raporTipi === "klinik"
                          ? "Laboratuvar sonuçları klinik ön değerlendirme raporu"
                          : "Referans dışı bulgular ve klinik özet raporu"}
                      </span>
                    </div>
                  </header>

                  <div className="pdf-kurum-satiri">
                    <span>Sağlık Bakanlığı Ruhsat tarih sayısı: 28.03.2022/09</span>
                    <span>Osman Gazi Mah. İbrahim Etem Cad. No:52/A</span>
                    <span>0232 33 22 112 · www.geropital.com</span>
                  </div>

                  <section className="pdf-hasta-satiri">
                    <div>
                      <span>Hasta</span>
                      <strong>{sonuc.hastaBilgisi?.adSoyad || "Belirtilmemiş"}</strong>
                    </div>

                    <div>
                      <span>TC Kimlik</span>
                      <strong className="pdf-tc">
                        {sonuc.hastaBilgisi?.tcKimlik || "Belirtilmemiş"}
                      </strong>
                    </div>

                    <div>
                      <span>Yaş</span>
                      <strong>{sonuc.hastaBilgisi?.yas || "Belirtilmemiş"}</strong>
                    </div>

                    <div>
                      <span>Cinsiyet</span>
                      <strong>{sonuc.hastaBilgisi?.cinsiyet || "Belirtilmemiş"}</strong>
                    </div>

                    <div>
                      <span>Rapor Tarihi</span>
                      <strong>
                        {sonuc.hastaBilgisi?.raporTarihi ||
                          new Date().toLocaleDateString("tr-TR")}
                      </strong>
                    </div>
                  </section>

                  <section className="pdf-ozet-satiri">
                    <div>
                      <strong>{sonuc.ozet?.toplamParametre || 0}</strong>
                      <span>Toplam</span>
                    </div>

                    <div>
                      <strong>{sonuc.ozet?.normalSayisi || 0}</strong>
                      <span>Normal</span>
                    </div>

                    <div>
                      <strong>{sonuc.ozet?.dusukSayisi || 0}</strong>
                      <span>Düşük</span>
                    </div>

                    <div>
                      <strong>{sonuc.ozet?.yuksekSayisi || 0}</strong>
                      <span>Yüksek</span>
                    </div>

                    <div>
                      <strong>{sonuc.ozet?.kritikSayisi || 0}</strong>
                      <span>Kritik</span>
                    </div>
                  </section>

                  <section className="pdf-genel-degerlendirme">
                    <h2>Genel Değerlendirme</h2>
                    <p>{sonuc.genelDegerlendirme}</p>
                  </section>
                </>
              ) : (
                <header className="pdf-devam-header">
                  <div>
                    <p>Rapor Devamı</p>
                    <h1>Kan Tahlili Değerlendirmesi</h1>
                  </div>

                  <span>
                    Sayfa {sayfaIndex + 1} / {pdfSayfalari.length}
                  </span>
                </header>
              )}

              <section className="pdf-parametreler">
                <h2>
                  Sonuçlar ve Kısa Yorumlar
                </h2>

                <div className="pdf-serit-liste">
                  {sayfaParametreleri.map((item, index) => {
                    const oncekiSayfalarinToplamElemani =
                      pdfSayfalari
                        .slice(0, sayfaIndex)
                        .reduce((toplam, sayfa) => toplam + sayfa.length, 0);

                    const globalIndex =
                      oncekiSayfalarinToplamElemani + index;

                    const kategoriBasligiGoster =
                      kategoriBasligiGosterilmeliMi(
                        pdfParametreler,
                        globalIndex
                      );

                    return (
                      <div
                        key={`${sayfaIndex}-${item.parametre}-${index}`}
                      >
                        {kategoriBasligiGoster && (
                          <h3 className="pdf-kategori-baslik">
                            {item.kategori || "Diğer"}
                          </h3>
                        )}

                        <div className="pdf-serit-satir">
                          <div className="pdf-serit-parametre">
                            <strong>{item.parametre}</strong>
                          </div>

                          <div className="pdf-serit-sonuc">
                            <span>Sonuç</span>
                            <strong>
                              {item.deger} {item.birim}
                            </strong>
                          </div>

                          <div className="pdf-serit-referans">
                            <span>Referans</span>
                            <strong>
                              {item.referans || "Belirtilmemiş"}
                            </strong>
                          </div>

                          <div className="pdf-serit-durum">
                            <b className={durumPdfSinifi(item.durum)}>
                              {durumYazi(item.durum)}
                            </b>
                          </div>

                          <div className="pdf-serit-yorum">
                            <p>{item.yorum}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {sayfaIndex === pdfSayfalari.length - 1 && (
                <section className="pdf-alt-alan">
                  <div>
                    <h2>Değerlendirme</h2>
                    <ul>
                      {sonuc.degerlendirmeMaddeleri?.slice(0, 3).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h2>Tedavi Notları</h2>
                    <ul>
                      {sonuc.tedaviNotlari?.slice(0, 3).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h2>Ek Not</h2>
                    <p>{sonuc.ekNot}</p>
                  </div>

                  <div className="pdf-manuel-notlar">
                    <h2>Manuel Notlar</h2>
                    <p>........................................................................</p>
                    <p>........................................................................</p>
                  </div>

                  <div className="pdf-tahlil-sonucu">
                    <h2>Tahlil Sonuçları Özeti</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "3mm", marginTop: "2mm" }}>
                      <div style={{ textAlign: "center", padding: "1.5mm", border: "0.5px solid #d7e3ea", borderRadius: "4px" }}>
                        <p style={{ margin: "0", fontSize: "7pt", color: "#64748b" }}>Normal</p>
                        <p style={{ margin: "0.5mm 0 0 0", fontSize: "10pt", fontWeight: "bold", color: "#16a34a" }}>
                          {sonuc?.ozet?.normalSayisi || 0}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", padding: "1.5mm", border: "0.5px solid #d7e3ea", borderRadius: "4px" }}>
                        <p style={{ margin: "0", fontSize: "7pt", color: "#64748b" }}>Düşük</p>
                        <p style={{ margin: "0.5mm 0 0 0", fontSize: "10pt", fontWeight: "bold", color: "#0ea5e9" }}>
                          {sonuc?.ozet?.dusukSayisi || 0}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", padding: "1.5mm", border: "0.5px solid #d7e3ea", borderRadius: "4px" }}>
                        <p style={{ margin: "0", fontSize: "7pt", color: "#64748b" }}>Yüksek</p>
                        <p style={{ margin: "0.5mm 0 0 0", fontSize: "10pt", fontWeight: "bold", color: "#f97316" }}>
                          {sonuc?.ozet?.yuksekSayisi || 0}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", padding: "1.5mm", border: "0.5px solid #d7e3ea", borderRadius: "4px" }}>
                        <p style={{ margin: "0", fontSize: "7pt", color: "#64748b" }}>Kritik</p>
                        <p style={{ margin: "0.5mm 0 0 0", fontSize: "10pt", fontWeight: "bold", color: "#dc2626" }}>
                          {sonuc?.ozet?.kritikSayisi || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <footer className="pdf-footer">
                <div style={{ fontSize: "6.3pt", textAlign: "center", color: "#64748b" }}>
                  <p style={{ margin: "0 0 0.3mm 0" }}>
                    Geropital Evde Sağlık ve Bakım Merkezi · Yapay zekâ destekli kurum içi ön değerlendirme raporu
                  </p>
                  <p style={{ margin: "0.3mm 0 0 0" }}>
                    {sonuc?.hastaBilgisi?.raporTarihi && `Rapor Tarihi: ${sonuc.hastaBilgisi.raporTarihi}`} · Oluşturulan: {new Date().toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </footer>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}