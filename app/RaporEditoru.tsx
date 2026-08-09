"use client";

import { useState } from "react";
import {
  AnalizSonucu,
  Durum,
  OgeTuru,
  Parametre,
  RaporOgesi,
  VurguRengi,
} from "./types/kanTahlili";

// Benzersiz id üretici (öğeler için)
function yeniId() {
  return `oge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const DURUM_SECENEKLERI: { deger: Durum; etiket: string }[] = [
  { deger: "normal", etiket: "Normal" },
  { deger: "dusuk", etiket: "Düşük" },
  { deger: "yuksek", etiket: "Yüksek" },
  { deger: "kritik", etiket: "Kritik" },
];

const VURGU_SECENEKLERI: { deger: VurguRengi; etiket: string }[] = [
  { deger: "bilgi", etiket: "Bilgi (mavi)" },
  { deger: "basari", etiket: "Olumlu (yeşil)" },
  { deger: "uyari", etiket: "Uyarı (sarı)" },
  { deger: "tehlike", etiket: "Kritik (kırmızı)" },
];

// Editöre eklenebilecek öğe butonları
const OGE_BUTONLARI: { tur: OgeTuru; etiket: string; ikon: string }[] = [
  { tur: "baslik", etiket: "Başlık", ikon: "H" },
  { tur: "paragraf", etiket: "Paragraf", ikon: "¶" },
  { tur: "vurgu", etiket: "Vurgu Kutusu", ikon: "!" },
  { tur: "liste", etiket: "Madde Listesi", ikon: "•" },
  { tur: "cubuk", etiket: "Değer Çubuğu", ikon: "▬" },
  { tur: "ayrac", etiket: "Ayraç Çizgi", ikon: "—" },
];

const inputStil =
  "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-300/40 focus-halka";

type Props = {
  sonuc: AnalizSonucu;
  setSonuc: React.Dispatch<React.SetStateAction<AnalizSonucu | null>>;
};

export default function RaporEditoru({ sonuc, setSonuc }: Props) {
  const [acikParametre, setAcikParametre] = useState<number | null>(null);

  // --- Parametre düzenleme ---
  function parametreGuncelle(index: number, alan: keyof Parametre, deger: string) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;
      const yeni = [...onceki.parametreler];
      yeni[index] = { ...yeni[index], [alan]: deger };
      return { ...onceki, parametreler: yeni };
    });
  }

  function parametreSil(index: number) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;
      const yeni = onceki.parametreler.filter((_, i) => i !== index);
      return { ...onceki, parametreler: yeni };
    });
    setAcikParametre(null);
  }

  function parametreEkle() {
    setSonuc((onceki) => {
      if (!onceki) return onceki;
      const yeniParametre: Parametre = {
        parametre: "Yeni Parametre",
        deger: "",
        referans: "",
        birim: "",
        durum: "normal",
        kategori: "Genel Biyokimya",
        yorum: "",
      };
      return { ...onceki, parametreler: [...onceki.parametreler, yeniParametre] };
    });
  }

  // --- Ekstra öğeler ---
  const ogeler = sonuc.ekOgeler || [];

  function ogeEkle(tur: OgeTuru) {
    const yeni: RaporOgesi = { id: yeniId(), tur };

    if (tur === "baslik") yeni.baslik = "Yeni Başlık";
    if (tur === "paragraf") yeni.metin = "Buraya metin yazın...";
    if (tur === "vurgu") {
      yeni.baslik = "Dikkat";
      yeni.metin = "Vurgulamak istediğiniz mesaj...";
      yeni.vurguRengi = "bilgi";
    }
    if (tur === "liste") yeni.maddeler = ["Birinci madde", "İkinci madde"];
    if (tur === "cubuk") {
      yeni.baslik = "Örnek Parametre";
      yeni.cubukDeger = "";
      yeni.cubukYuzde = 50;
      yeni.cubukDurum = "normal";
    }

    setSonuc((onceki) => {
      if (!onceki) return onceki;
      return { ...onceki, ekOgeler: [...(onceki.ekOgeler || []), yeni] };
    });
  }

  function ogeGuncelle(id: string, degisiklik: Partial<RaporOgesi>) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;
      const yeni = (onceki.ekOgeler || []).map((o) =>
        o.id === id ? { ...o, ...degisiklik } : o
      );
      return { ...onceki, ekOgeler: yeni };
    });
  }

  function ogeSil(id: string) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;
      return {
        ...onceki,
        ekOgeler: (onceki.ekOgeler || []).filter((o) => o.id !== id),
      };
    });
  }

  function ogeTasi(id: string, yon: -1 | 1) {
    setSonuc((onceki) => {
      if (!onceki) return onceki;
      const liste = [...(onceki.ekOgeler || [])];
      const i = liste.findIndex((o) => o.id === id);
      const j = i + yon;
      if (i < 0 || j < 0 || j >= liste.length) return onceki;
      [liste[i], liste[j]] = [liste[j], liste[i]];
      return { ...onceki, ekOgeler: liste };
    });
  }

  return (
    <div className="space-y-8">
      {/* ============ PARAMETRE DÜZENLEME ============ */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-100">
            Parametreleri Düzenle
          </h3>
          <button
            onClick={parametreEkle}
            className="focus-halka rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200 transition hover:bg-cyan-400/25"
          >
            + Parametre Ekle
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Her satıra tıklayarak değeri, referansı, durumunu ve yorumunu
          düzenleyebilirsiniz. Bu değişiklikler PDF'e aynen yansır.
        </p>

        <div className="space-y-2">
          {sonuc.parametreler.map((item, index) => {
            const acik = acikParametre === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40"
              >
                <button
                  onClick={() => setAcikParametre(acik ? null : index)}
                  className="focus-halka flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{item.parametre}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.deger} {item.birim}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.durum === "kritik"
                          ? "bg-red-500/15 text-red-600 dark:text-red-300"
                          : item.durum === "yuksek"
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-300"
                          : item.durum === "dusuk"
                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      }`}
                    >
                      {DURUM_SECENEKLERI.find((d) => d.deger === item.durum)?.etiket}
                    </span>
                    <span className="text-slate-400">{acik ? "▲" : "▼"}</span>
                  </span>
                </button>

                {acik && (
                  <div className="border-t border-slate-200 dark:border-white/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Parametre Adı
                        </label>
                        <input
                          value={item.parametre}
                          onChange={(e) =>
                            parametreGuncelle(index, "parametre", e.target.value)
                          }
                          className={inputStil}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Kategori
                        </label>
                        <input
                          value={item.kategori}
                          onChange={(e) =>
                            parametreGuncelle(index, "kategori", e.target.value)
                          }
                          className={inputStil}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Değer
                        </label>
                        <input
                          value={item.deger}
                          onChange={(e) =>
                            parametreGuncelle(index, "deger", e.target.value)
                          }
                          className={inputStil}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Birim
                        </label>
                        <input
                          value={item.birim}
                          onChange={(e) =>
                            parametreGuncelle(index, "birim", e.target.value)
                          }
                          className={inputStil}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Referans Aralığı
                        </label>
                        <input
                          value={item.referans}
                          onChange={(e) =>
                            parametreGuncelle(index, "referans", e.target.value)
                          }
                          className={inputStil}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Durum
                        </label>
                        <select
                          value={item.durum}
                          onChange={(e) =>
                            parametreGuncelle(index, "durum", e.target.value)
                          }
                          className={inputStil}
                        >
                          {DURUM_SECENEKLERI.map((d) => (
                            <option key={d.deger} value={d.deger}>
                              {d.etiket}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Yorum
                        </label>
                        <textarea
                          value={item.yorum}
                          onChange={(e) =>
                            parametreGuncelle(index, "yorum", e.target.value)
                          }
                          className={`${inputStil} h-24`}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => parametreSil(index)}
                        className="focus-halka rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-300 transition hover:bg-red-500/20"
                      >
                        Bu Parametreyi Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ EKSTRA ÖĞE EKLEME ============ */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-cyan-700 dark:text-cyan-100">
          Rapora Öğe Ekle
        </h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Aşağıdaki butonlarla rapora ekstra bloklar ekleyebilirsiniz. Eklenen
          her öğe PDF'in "Notlar" bölümüne sırayla yansır.
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          {OGE_BUTONLARI.map((btn) => (
            <button
              key={btn.tur}
              onClick={() => ogeEkle(btn.tur)}
              className="focus-halka flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/10 px-3 py-2 text-sm font-medium transition hover:border-cyan-300/50 hover:bg-cyan-400/10"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-400/20 text-xs text-cyan-700 dark:text-cyan-200">
                {btn.ikon}
              </span>
              {btn.etiket}
            </button>
          ))}
        </div>

        {ogeler.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
            Henüz öğe eklenmedi. Yukarıdaki butonlarla başlayın.
          </div>
        ) : (
          <div className="space-y-3">
            {ogeler.map((oge, index) => (
              <OgeDuzenleyici
                key={oge.id}
                oge={oge}
                ilkMi={index === 0}
                sonMu={index === ogeler.length - 1}
                onGuncelle={(d) => ogeGuncelle(oge.id, d)}
                onSil={() => ogeSil(oge.id)}
                onTasi={(yon) => ogeTasi(oge.id, yon)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tek bir öğeyi düzenleyen alt bileşen ---
function OgeDuzenleyici({
  oge,
  ilkMi,
  sonMu,
  onGuncelle,
  onSil,
  onTasi,
}: {
  oge: RaporOgesi;
  ilkMi: boolean;
  sonMu: boolean;
  onGuncelle: (d: Partial<RaporOgesi>) => void;
  onSil: () => void;
  onTasi: (yon: -1 | 1) => void;
}) {
  const turEtiket: Record<OgeTuru, string> = {
    baslik: "Başlık",
    paragraf: "Paragraf",
    vurgu: "Vurgu Kutusu",
    liste: "Madde Listesi",
    cubuk: "Değer Çubuğu",
    ayrac: "Ayraç Çizgi",
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200">
          {turEtiket[oge.tur]}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTasi(-1)}
            disabled={ilkMi}
            title="Yukarı taşı"
            className="focus-halka rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-white/10"
          >
            ↑
          </button>
          <button
            onClick={() => onTasi(1)}
            disabled={sonMu}
            title="Aşağı taşı"
            className="focus-halka rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-white/10"
          >
            ↓
          </button>
          <button
            onClick={onSil}
            title="Sil"
            className="focus-halka rounded-lg px-2 py-1 text-red-500 transition hover:bg-red-500/10"
          >
            ✕
          </button>
        </div>
      </div>

      {oge.tur === "baslik" && (
        <input
          value={oge.baslik || ""}
          onChange={(e) => onGuncelle({ baslik: e.target.value })}
          placeholder="Başlık metni"
          className={inputStil}
        />
      )}

      {oge.tur === "paragraf" && (
        <textarea
          value={oge.metin || ""}
          onChange={(e) => onGuncelle({ metin: e.target.value })}
          placeholder="Paragraf metni"
          className={`${inputStil} h-24`}
        />
      )}

      {oge.tur === "vurgu" && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={oge.baslik || ""}
              onChange={(e) => onGuncelle({ baslik: e.target.value })}
              placeholder="Kutu başlığı"
              className={inputStil}
            />
            <select
              value={oge.vurguRengi || "bilgi"}
              onChange={(e) =>
                onGuncelle({ vurguRengi: e.target.value as VurguRengi })
              }
              className={inputStil}
            >
              {VURGU_SECENEKLERI.map((v) => (
                <option key={v.deger} value={v.deger}>
                  {v.etiket}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={oge.metin || ""}
            onChange={(e) => onGuncelle({ metin: e.target.value })}
            placeholder="Kutu içeriği"
            className={`${inputStil} h-20`}
          />
        </div>
      )}

      {oge.tur === "liste" && (
        <textarea
          value={(oge.maddeler || []).join("\n")}
          onChange={(e) =>
            onGuncelle({
              maddeler: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Her satıra bir madde yazın"
          className={`${inputStil} h-28`}
        />
      )}

      {oge.tur === "cubuk" && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={oge.baslik || ""}
              onChange={(e) => onGuncelle({ baslik: e.target.value })}
              placeholder="Parametre adı"
              className={inputStil}
            />
            <input
              value={oge.cubukDeger || ""}
              onChange={(e) => onGuncelle({ cubukDeger: e.target.value })}
              placeholder="Değer (örn. 12.4 g/dL)"
              className={inputStil}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Referans bandındaki konum</span>
              <span className="font-semibold">%{oge.cubukYuzde ?? 50}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={oge.cubukYuzde ?? 50}
              onChange={(e) =>
                onGuncelle({ cubukYuzde: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Düşük</span>
              <span>Normal</span>
              <span>Yüksek</span>
            </div>
          </div>
          <select
            value={oge.cubukDurum || "normal"}
            onChange={(e) =>
              onGuncelle({ cubukDurum: e.target.value as Durum })
            }
            className={inputStil}
          >
            {DURUM_SECENEKLERI.map((d) => (
              <option key={d.deger} value={d.deger}>
                {d.etiket}
              </option>
            ))}
          </select>

          {/* Canlı önizleme çubuğu */}
          <CubukOnizleme
            yuzde={oge.cubukYuzde ?? 50}
            durum={oge.cubukDurum || "normal"}
          />
        </div>
      )}

      {oge.tur === "ayrac" && (
        <div className="py-2">
          <div className="h-px w-full bg-slate-300 dark:bg-white/20" />
          <p className="mt-2 text-center text-xs text-slate-400">
            İnce ayraç çizgi (düzenlenecek içerik yok)
          </p>
        </div>
      )}
    </div>
  );
}

function CubukOnizleme({ yuzde, durum }: { yuzde: number; durum: Durum }) {
  const renk =
    durum === "kritik"
      ? "#dc2626"
      : durum === "yuksek"
      ? "#ea580c"
      : durum === "dusuk"
      ? "#0284c7"
      : "#059669";

  return (
    <div className="rounded-xl bg-white dark:bg-slate-950/60 p-3">
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-sky-200 via-emerald-200 to-orange-200 dark:from-sky-500/30 dark:via-emerald-500/30 dark:to-orange-500/30">
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${Math.max(0, Math.min(100, yuzde))}%`, backgroundColor: renk }}
        />
      </div>
    </div>
  );
}