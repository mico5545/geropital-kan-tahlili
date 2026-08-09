// Bu dosya, kan tahlili analiz sonucunun TEK ve ORTAK tip tanımıdır.
// Hem app/page.tsx, hem app/api/kan-tahlili-analiz/route.ts, hem de
// app/api/kan-tahlili-pdf/route.ts (ve PDF şablonu) buradan import eder.
//
// ÖNEMLİ: Daha önce bu tip 3 farklı dosyada (page.tsx, KanTahliliRaporu.tsx,
// route.ts) BİRBİRİNDEN FARKLI şekillerde tanımlanmıştı (örn. bir yerde
// "oneriler", başka yerde "degerlendirmeMaddeleri" + "tedaviNotlari").
// Bu, projedeki "modülde bozulma" şikayetlerinin bir kısmının kaynağıydı.
// Artık tek kaynak burası.

export type Durum = "normal" | "dusuk" | "yuksek" | "kritik";

// Hangi PDF şablonuyla çıktı alınacağını belirler.
// "modern": React-PDF ile kurumsal, ikonlu, tablolu tasarım (varsayılan).
// "klasik": Geropital'in mevcut resmi rapor formatı - numaralı başlıklar
//            (1. KAN SAYIMI...), madde madde açıklamalar, "Yorum:" blokları.
export type SablonTuru = "modern" | "klasik";

export type HastaBilgisi = {
  adSoyad: string;
  tcKimlik: string;
  yas: string;
  cinsiyet: string;
  raporTarihi: string;
};

export type Ozet = {
  toplamParametre: number;
  normalSayisi: number;
  dusukSayisi: number;
  yuksekSayisi: number;
  kritikSayisi: number;
};

export type Parametre = {
  parametre: string;
  deger: string;
  referans: string;
  birim: string;
  durum: Durum;
  kategori: string;
  yorum: string;
};

// --- EDİTÖR ÖĞELERİ ---
// Editör sayfasında personelin rapora elle ekleyebileceği ekstra bloklar.
// Bunlar analizden gelmez; kullanıcı "öğe ekle" butonlarıyla oluşturur ve
// PDF'in sonuna (notlar bölümüne) sırayla basılır.
export type OgeTuru =
  | "baslik" // Bir alt başlık / bölüm ayracı
  | "paragraf" // Serbest metin paragrafı
  | "vurgu" // Renkli vurgu kutusu (bilgi/uyarı/başarı/tehlike)
  | "liste" // Madde işaretli liste
  | "cubuk" // Tek bir parametrenin referans-konum çubuğu (görsel)
  | "ayrac"; // İnce yatay çizgi

export type VurguRengi = "bilgi" | "uyari" | "basari" | "tehlike";

export type RaporOgesi = {
  id: string;
  tur: OgeTuru;
  // Kullanılan alanlar öğe türüne göre değişir; hepsi opsiyonel.
  baslik?: string; // baslik, vurgu, cubuk
  metin?: string; // paragraf, vurgu
  maddeler?: string[]; // liste
  vurguRengi?: VurguRengi; // vurgu
  // "cubuk" için: değerin referans bandındaki konumu (0-100 arası),
  // ve gösterilecek sayısal değer/etiket.
  cubukDeger?: string;
  cubukYuzde?: number; // 0-100
  cubukDurum?: Durum;
};

export type AnalizSonucu = {
  hastaBilgisi: HastaBilgisi;
  ozet: Ozet;
  parametreler: Parametre[];
  genelDegerlendirme: string;
  tedaviNotlari: string[];
  uyariMesaji: string;
  // Raporu düzenleyen/onaylayan personel - admin panelinde elle girilir,
  // Gemini bu alanı doldurmaz. Opsiyonel: eski kayıtlarla uyumlu olsun diye.
  degerlendirenKisi?: string;
  // Editörde eklenen ekstra bloklar (opsiyonel; eski kayıtlarla uyumlu).
  ekOgeler?: RaporOgesi[];
};

// PDF'te kategori başlığının yanına çizilecek küçük sembol için hangi
// ikon ailesinin kullanılacağını belirler (bkz. kanTahliliPdfBelgesi.tsx).
export type KategoriIkonTuru =
  | "damla" // Hemogram / Kan Sayımı
  | "molekul" // Karaciğer
  | "huni" // Böbrek
  | "kalkan" // İnflamasyon / Enfeksiyon
  | "hedef" // Tümör Belirteçleri
  | "gunes" // Vitamin
  | "erlen" // Biyokimya
  | "kalp" // Yağ Metabolizması / Lipid
  | "bolt" // Elektrolit / Mineral
  | "tiroid" // Tiroid Hormonları
  | "diger";

export function kategoriIkonTuruBelirle(kategori: string): KategoriIkonTuru {
  const k = (kategori || "").toLowerCase();

  if (k.includes("hemogram") || k.includes("kan sayım")) return "damla";
  if (k.includes("karaciğer") || k.includes("karaciger")) return "molekul";
  if (k.includes("böbrek") || k.includes("bobrek")) return "huni";
  if (k.includes("inflamasyon") || k.includes("enfeksiyon") || k.includes("crp"))
    return "kalkan";
  if (k.includes("tümör") || k.includes("tumor") || k.includes("kanser"))
    return "hedef";
  if (k.includes("vitamin")) return "gunes";
  if (k.includes("yağ") || k.includes("yag") || k.includes("lipid") || k.includes("kolesterol"))
    return "kalp";
  if (
    k.includes("elektrolit") ||
    k.includes("mineral") ||
    k.includes("sodyum") ||
    k.includes("potasyum")
  )
    return "bolt";
  if (k.includes("tiroid") || k.includes("tsh")) return "tiroid";
  if (k.includes("biyokimya")) return "erlen";

  return "diger";
}

// Her kategori ikonu için marka kimliğiyle uyumlu, birbirinden ayırt
// edilebilir ama göz yormayan bir vurgu rengi.
export const KATEGORI_RENK: Record<KategoriIkonTuru, string> = {
  damla: "#dc2626",
  molekul: "#d97706",
  huni: "#2563eb",
  kalkan: "#7c3aed",
  hedef: "#db2777",
  gunes: "#ca8a04",
  erlen: "#0097a7",
  kalp: "#e11d48",
  bolt: "#0891b2",
  tiroid: "#7c3aed",
  diger: "#64748b",
};

export const DURUM_ETIKET: Record<Durum, string> = {
  normal: "Normal",
  dusuk: "Düşük",
  yuksek: "Yüksek",
  kritik: "Kritik",
};

// Kategori içindeki sıralama önceliği: kritik değerler en üstte.
export const DURUM_ONCELIK: Record<Durum, number> = {
  kritik: 0,
  yuksek: 1,
  dusuk: 2,
  normal: 3,
};

export function durumGecerliMi(deger: unknown): deger is Durum {
  return (
    deger === "normal" ||
    deger === "dusuk" ||
    deger === "yuksek" ||
    deger === "kritik"
  );
}

// Parametreleri kategoriye göre grupla, her kategori içinde durum
// önceliğine göre sırala (kritik/yüksek en üstte). Böylece PDF'te
// aynı kategori başlığı defalarca tekrar etmez (eski koddaki hataydı:
// önce duruma göre sıralanıp kategori bu sıralamanın İÇİNDE
// kontrol edildiği için kategori başlıkları parça parça tekrar ediyordu).
export function kategorilereGoreGrupla(
  parametreler: Parametre[]
): { kategori: string; parametreler: Parametre[] }[] {
  const gruplar = new Map<string, Parametre[]>();

  parametreler.forEach((item) => {
    const kategori = item.kategori || "Diğer";
    if (!gruplar.has(kategori)) {
      gruplar.set(kategori, []);
    }
    gruplar.get(kategori)!.push(item);
  });

  return Array.from(gruplar.entries()).map(([kategori, liste]) => ({
    kategori,
    parametreler: [...liste].sort(
      (a, b) => DURUM_ONCELIK[a.durum] - DURUM_ONCELIK[b.durum]
    ),
  }));
}