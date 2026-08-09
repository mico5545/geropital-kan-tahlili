import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Circle,
  Line,
  Polygon,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  AnalizSonucu,
  DURUM_ETIKET,
  KATEGORI_RENK,
  KategoriIkonTuru,
  Parametre,
  RaporOgesi,
  kategoriIkonTuruBelirle,
  kategorilereGoreGrupla,
} from "../types/kanTahlili";

// ----------------------------------------------------------------------
// FONT KAYDI
// ----------------------------------------------------------------------
// React-PDF'in yerleşik fontları (Helvetica vb.) Türkçe karakterleri
// (ğ, ş, ı, İ, ö, ç) doğru basamaz - bu yüzden gerçek bir TTF font
// gömüyoruz.
//
// ÖNEMLİ: Bu şablon HEM sunucuda (indirme için) HEM tarayıcıda (canlı
// önizleme için) çalışır. Bu yüzden font/logo kaynağını doğrudan burada
// dosya sisteminden okumuyoruz (fs/path tarayıcıda çalışmaz). Bunun
// yerine font URL'leri ile Image kaynağı DIŞARIDAN parametre olarak
// veriliyor:
//   - Sunucu tarafı: /public/fonts altındaki dosyaları okuyup data-URI
//     veya mutlak dosya yolu olarak verir (bkz. api/kan-tahlili-pdf).
//   - Tarayıcı tarafı: /fonts/Inter-Regular.ttf gibi public URL'leri verir.
let fontlarKayitliMi = false;

function fontlariKaydet(fontYollari: FontYollari) {
  if (fontlarKayitliMi) return;

  Font.register({
    family: "Inter",
    fonts: [
      { src: fontYollari.regular, fontWeight: 400 },
      { src: fontYollari.medium, fontWeight: 500 },
      { src: fontYollari.semibold, fontWeight: 600 },
      { src: fontYollari.bold, fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback((kelime) => [kelime]);

  fontlarKayitliMi = true;
}

export type FontYollari = {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
};

// Tarayıcıda kullanılacak public URL'ler. Sunucu tarafı kendi yollarını
// ayrıca verir.
export const TARAYICI_FONT_YOLLARI: FontYollari = {
  regular: "/fonts/Inter-Regular.ttf",
  medium: "/fonts/Inter-Medium.ttf",
  semibold: "/fonts/Inter-SemiBold.ttf",
  bold: "/fonts/Inter-Bold.ttf",
};

export const TARAYICI_LOGO = "/logoGeropital.png";

// ----------------------------------------------------------------------
// RENKLER
// ----------------------------------------------------------------------
const RENK = {
  lacivert: "#16324f",
  teal: "#0097a7",
  tealAcik: "#36a8bd",
  gri: "#64748b",
  griMetin: "#334155",
  griBorder: "#d7e3ea",
  griArkaplan: "#f8fafc",
  yesilBg: "#e8f8ef",
  yesilMetin: "#087443",
  maviBg: "#e8f5ff",
  maviMetin: "#0369a1",
  turuncuBg: "#fff3e6",
  turuncuMetin: "#c25a00",
  kirmiziBg: "#ffecec",
  kirmiziMetin: "#b91c1c",
};

const DURUM_RENK: Record<Parametre["durum"], { bg: string; metin: string }> = {
  normal: { bg: RENK.yesilBg, metin: RENK.yesilMetin },
  dusuk: { bg: RENK.maviBg, metin: RENK.maviMetin },
  yuksek: { bg: RENK.turuncuBg, metin: RENK.turuncuMetin },
  kritik: { bg: RENK.kirmiziBg, metin: RENK.kirmiziMetin },
};

// ----------------------------------------------------------------------
// STİLLER
// ----------------------------------------------------------------------
// NOT: Bu rapor genellikle yaşlı hasta/hasta yakınına gönderiliyor, bu
// yüzden font boyutları "kurum içi sıkıştırılmış tablo" değil, "rahat
// okunur, gözü yormayan resmi rapor" mantığıyla büyütüldü.
const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: "#111827",
    paddingTop: 30,
    paddingBottom: 46,
    paddingHorizontal: 26,
    backgroundColor: "#ffffff",
  },

  // --- Başlık (kapak sayfası) ---
  headerKutu: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: RENK.griBorder,
    borderLeftWidth: 5,
    borderLeftColor: RENK.tealAcik,
    borderRadius: 8,
    padding: 12,
  },
  logoAlani: {
    width: 118,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 108, height: 46, objectFit: "contain" },
  kurumEtiket: {
    color: RENK.tealAcik,
    fontSize: 8.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  baslik: {
    color: RENK.lacivert,
    fontSize: 20,
    fontWeight: 700,
    marginTop: 4,
  },
  altBaslik: { color: RENK.gri, fontSize: 9, marginTop: 4 },

  kurumSatiri: { flexDirection: "row", marginTop: 8 },
  kurumSutun: {
    flex: 1,
    color: RENK.gri,
    fontSize: 7.4,
    borderBottomWidth: 1,
    borderBottomColor: RENK.griBorder,
    paddingBottom: 4,
    marginRight: 8,
  },

  // --- Hasta / Özet satırları ---
  kutuSatiri: { flexDirection: "row", marginTop: 9 },
  kutu: {
    flex: 1,
    borderWidth: 1,
    borderColor: RENK.griBorder,
    borderRadius: 6,
    backgroundColor: RENK.griArkaplan,
    padding: 7,
    marginRight: 6,
  },
  kutuSonSutun: { marginRight: 0 },
  kutuEtiket: { color: RENK.gri, fontSize: 7.2 },
  kutuDeger: { color: RENK.lacivert, fontSize: 9.5, fontWeight: 700, marginTop: 3 },

  ozetKutu: {
    flex: 1,
    borderWidth: 1,
    borderColor: RENK.griBorder,
    borderRadius: 6,
    padding: 7,
    marginRight: 6,
    alignItems: "center",
  },
  ozetSayi: { color: RENK.lacivert, fontSize: 16, fontWeight: 700 },
  ozetEtiket: { color: RENK.gri, fontSize: 7.2, marginTop: 3 },

  // --- Genel değerlendirme ---
  genelKutu: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: "#c8eef4",
    borderRadius: 8,
    backgroundColor: "#f0fbfd",
    padding: 11,
  },
  h2: { color: RENK.lacivert, fontSize: 11.5, fontWeight: 700 },
  paragraf: {
    color: RENK.griMetin,
    fontSize: 9.4,
    lineHeight: 1.5,
    marginTop: 5,
  },

  degerlendirenSatiri: {
    marginTop: 9,
    color: RENK.gri,
    fontSize: 8,
    textAlign: "right",
  },

  // --- Kategori sayfası başlığı ---
  kategoriBlok: {
    marginBottom: 16,
  },
  bolumBasligi: {
    color: RENK.lacivert,
    fontSize: 18,
    fontWeight: 700,
  },
  bolumAltBasligi: {
    color: RENK.gri,
    fontSize: 9,
    marginTop: 3,
    marginBottom: 6,
  },
  kategoriSayfaBaslik: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
    paddingBottom: 9,
    borderBottomWidth: 2,
    borderBottomColor: RENK.griBorder,
  },
  kategoriIkonRozet: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  kategoriSayfaBaslikMetin: {
    color: RENK.lacivert,
    fontSize: 16,
    fontWeight: 700,
  },
  kategoriSayfaAltMetin: {
    color: RENK.gri,
    fontSize: 8.4,
    marginTop: 2,
  },

  // --- Parametre listesi ---
  satir: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: RENK.griBorder,
    borderTopWidth: 0,
    minHeight: 28,
    alignItems: "stretch",
  },
  ilkSatir: { borderTopWidth: 1, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  sonSatir: { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  satirAcik: { backgroundColor: "#ffffff" },
  satirKoyu: { backgroundColor: "#f3f9fc" },
  hucre: {
    borderRightWidth: 1,
    borderRightColor: RENK.griBorder,
    paddingVertical: 5,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  hucreSon: { borderRightWidth: 0 },
  hucreEtiket: {
    color: RENK.gri,
    fontSize: 6.6,
    textTransform: "uppercase",
  },
  hucreDeger: {
    color: RENK.lacivert,
    fontSize: 8.8,
    fontWeight: 700,
    marginTop: 2,
  },
  hucreDegerKoyu: { color: "#111827", fontWeight: 600 },
  yorumMetni: { color: RENK.griMetin, fontSize: 8.3, lineHeight: 1.35 },
  durumAlani: { alignItems: "center", justifyContent: "center" },
  durumRozet: {
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 7.2,
    fontWeight: 700,
    textAlign: "center",
  },

  // --- Notlar sayfası ---
  notBaslikKutu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#c8eef4",
    borderRadius: 8,
    backgroundColor: "#f0fbfd",
    padding: 12,
  },
  notKutu: {
    borderRadius: 8,
    backgroundColor: RENK.griArkaplan,
    padding: 11,
  },
  notMadde: { color: RENK.griMetin, fontSize: 9, lineHeight: 1.45, marginBottom: 4 },

  // --- Footer (her sayfada) ---
  footer: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 18,
    borderTopWidth: 1,
    borderTopColor: RENK.griBorder,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerMetin: { color: RENK.gri, fontSize: 6.8 },

  // --- Editörden gelen ekstra öğeler ---
  ogeBaslik: {
    fontSize: 12,
    fontWeight: 700,
    color: RENK.lacivert,
    marginTop: 10,
    marginBottom: 4,
  },
  ogeParagraf: {
    fontSize: 9.4,
    color: RENK.griMetin,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 4,
  },
  ogeVurgu: {
    marginTop: 8,
    marginBottom: 4,
    padding: 9,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  ogeVurguBaslik: { fontSize: 9.6, fontWeight: 700, marginBottom: 3 },
  ogeVurguMetin: { fontSize: 9, lineHeight: 1.45 },
  ogeListeMadde: {
    fontSize: 9.2,
    color: RENK.griMetin,
    lineHeight: 1.4,
    marginBottom: 3,
    marginLeft: 4,
  },
  ogeAyrac: {
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: RENK.griBorder,
  },
  cubukKutu: { marginTop: 8, marginBottom: 6 },
  cubukBaslikSatiri: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cubukBaslik: { fontSize: 9.4, fontWeight: 700, color: RENK.lacivert },
  cubukDeger: { fontSize: 9.4, fontWeight: 700 },
  cubukRay: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e8eef2",
    position: "relative",
  },
  cubukIsaret: {
    position: "absolute",
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  cubukEtiketSatiri: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  cubukEtiket: { fontSize: 6.6, color: RENK.gri },
});

const VURGU_RENK: Record<string, { bg: string; border: string; metin: string }> = {
  bilgi: { bg: "#eff6ff", border: "#3b82f6", metin: "#1e40af" },
  basari: { bg: "#ecfdf5", border: "#10b981", metin: "#065f46" },
  uyari: { bg: "#fffbeb", border: "#f59e0b", metin: "#92400e" },
  tehlike: { bg: "#fef2f2", border: "#ef4444", metin: "#991b1b" },
};

function cubukRenk(durum?: string) {
  if (durum === "kritik") return "#dc2626";
  if (durum === "yuksek") return "#ea580c";
  if (durum === "dusuk") return "#0284c7";
  return "#059669";
}

// Editörde eklenen ekstra öğeleri PDF'e basar.
function EkOgeler({ ogeler }: { ogeler: RaporOgesi[] }) {
  if (!ogeler || ogeler.length === 0) return null;

  return (
    <View style={{ marginTop: 6 }}>
      {ogeler.map((oge) => {
        if (oge.tur === "baslik") {
          return (
            <Text key={oge.id} style={styles.ogeBaslik} wrap={false}>
              {oge.baslik}
            </Text>
          );
        }

        if (oge.tur === "paragraf") {
          return (
            <Text key={oge.id} style={styles.ogeParagraf}>
              {oge.metin}
            </Text>
          );
        }

        if (oge.tur === "vurgu") {
          const renk = VURGU_RENK[oge.vurguRengi || "bilgi"];
          return (
            <View
              key={oge.id}
              style={[
                styles.ogeVurgu,
                { backgroundColor: renk.bg, borderLeftColor: renk.border },
              ]}
              wrap={false}
            >
              {oge.baslik ? (
                <Text style={[styles.ogeVurguBaslik, { color: renk.metin }]}>
                  {oge.baslik}
                </Text>
              ) : null}
              <Text style={[styles.ogeVurguMetin, { color: renk.metin }]}>
                {oge.metin}
              </Text>
            </View>
          );
        }

        if (oge.tur === "liste") {
          return (
            <View key={oge.id} style={{ marginTop: 4, marginBottom: 4 }} wrap={false}>
              {(oge.maddeler || []).map((madde, i) => (
                <Text key={i} style={styles.ogeListeMadde}>
                  • {madde}
                </Text>
              ))}
            </View>
          );
        }

        if (oge.tur === "cubuk") {
          const yuzde = Math.max(0, Math.min(100, oge.cubukYuzde ?? 50));
          const renk = cubukRenk(oge.cubukDurum);
          return (
            <View key={oge.id} style={styles.cubukKutu} wrap={false}>
              <View style={styles.cubukBaslikSatiri}>
                <Text style={styles.cubukBaslik}>{oge.baslik}</Text>
                <Text style={[styles.cubukDeger, { color: renk }]}>
                  {oge.cubukDeger}
                </Text>
              </View>
              <View style={styles.cubukRay}>
                <View
                  style={[
                    styles.cubukIsaret,
                    { left: `${yuzde}%`, marginLeft: -6, backgroundColor: renk },
                  ]}
                />
              </View>
              <View style={styles.cubukEtiketSatiri}>
                <Text style={styles.cubukEtiket}>Düşük</Text>
                <Text style={styles.cubukEtiket}>Normal</Text>
                <Text style={styles.cubukEtiket}>Yüksek</Text>
              </View>
            </View>
          );
        }

        if (oge.tur === "ayrac") {
          return <View key={oge.id} style={styles.ogeAyrac} />;
        }

        return null;
      })}
    </View>
  );
}

function durumRozetStil(durum: Parametre["durum"]) {
  const renkler = DURUM_RENK[durum];
  return { ...styles.durumRozet, backgroundColor: renkler.bg, color: renkler.metin };
}

// ----------------------------------------------------------------------
// KATEGORİ İKONLARI (vektörel, 16x16 birim alanda) - sade ve evrensel
// semboller: fotoğraf/emoji değil, PDF motorunda garanti çalışan
// Svg ilkel şekilleri (Circle/Line/Polygon) kullanılıyor.
// ----------------------------------------------------------------------
function IkonGövde({ tur }: { tur: KategoriIkonTuru }) {
  const beyaz = "#ffffff";

  switch (tur) {
    case "damla":
      // Su damlası: iki üçgen + daire yaklaşıklaması yerine, güvenilir
      // birincil şekillerle sadeleştirilmiş damla silüeti.
      return (
        <>
          <Polygon points="8,2 12.2,9.2 3.8,9.2" fill={beyaz} />
          <Circle cx={8} cy={10.3} r={3.6} fill={beyaz} />
        </>
      );
    case "molekul":
      return (
        <>
          <Line x1={5} y1={6} x2={11} y2={6} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={5} y1={6} x2={8} y2={11.5} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={11} y1={6} x2={8} y2={11.5} stroke={beyaz} strokeWidth={1.2} />
          <Circle cx={5} cy={6} r={1.7} fill={beyaz} />
          <Circle cx={11} cy={6} r={1.7} fill={beyaz} />
          <Circle cx={8} cy={11.5} r={1.7} fill={beyaz} />
        </>
      );
    case "huni":
      return (
        <Polygon points="2.5,3 13.5,3 9,9 9,13.5 7,13.5 7,9" fill={beyaz} />
      );
    case "kalkan":
      return (
        <>
          <Polygon points="8,1.5 14,4 14,8 8,14.5 2,8 2,4" fill={beyaz} />
          <Polygon points="7,4.5 9,4.5 9,7 11.5,7 11.5,9 9,9 9,11.5 7,11.5 7,9 4.5,9 4.5,7 7,7" fill="#7c3aed" />
        </>
      );
    case "hedef":
      return (
        <>
          <Circle cx={8} cy={8} r={6.2} stroke={beyaz} strokeWidth={1.3} fill="none" />
          <Circle cx={8} cy={8} r={3.4} fill={beyaz} />
          <Circle cx={8} cy={8} r={1.1} fill="#db2777" />
        </>
      );
    case "gunes":
      return (
        <>
          <Circle cx={8} cy={8} r={3} fill={beyaz} />
          <Line x1={8} y1={1} x2={8} y2={3.3} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={8} y1={12.7} x2={8} y2={15} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={1} y1={8} x2={3.3} y2={8} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={12.7} y1={8} x2={15} y2={8} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={3.05} y1={3.05} x2={4.7} y2={4.7} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={11.3} y1={11.3} x2={12.95} y2={12.95} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={3.05} y1={12.95} x2={4.7} y2={11.3} stroke={beyaz} strokeWidth={1.2} />
          <Line x1={11.3} y1={4.7} x2={12.95} y2={3.05} stroke={beyaz} strokeWidth={1.2} />
        </>
      );
    case "erlen":
      return <Polygon points="6,1.5 10,1.5 10,5.5 14,14.5 2,14.5 6,5.5" fill={beyaz} />;
    case "kalp":
      return (
        <Polygon
          points="8,14 2.5,8.5 2.5,5 5,3 8,5 11,3 13.5,5 13.5,8.5"
          fill={beyaz}
        />
      );
    case "bolt":
      return <Polygon points="9,1 3.5,9 7.5,9 6.5,15 12.5,7 8.5,7" fill={beyaz} />;
    case "tiroid":
      return (
        <>
          <Circle cx={5.5} cy={9} r={3.2} fill={beyaz} />
          <Circle cx={10.5} cy={9} r={3.2} fill={beyaz} />
          <Line x1={8} y1={6} x2={8} y2={9} stroke={beyaz} strokeWidth={1.4} />
        </>
      );
    default:
      return (
        <>
          <Circle cx={8} cy={8} r={6} stroke={beyaz} strokeWidth={1.2} fill="none" />
          <Circle cx={8} cy={8} r={1.6} fill={beyaz} />
        </>
      );
  }
}

function KategoriIkonu({ kategori }: { kategori: string }) {
  const tur = kategoriIkonTuruBelirle(kategori);
  const renk = KATEGORI_RENK[tur];

  return (
    <View style={[styles.kategoriIkonRozet, { backgroundColor: renk }]}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <IkonGövde tur={tur} />
      </Svg>
    </View>
  );
}

// ----------------------------------------------------------------------
// ALT BİLEŞENLER
// ----------------------------------------------------------------------
function ParametreSatiri({
  item,
  index,
  toplamSatir,
}: {
  item: Parametre;
  index: number;
  toplamSatir: number;
}) {
  return (
    // wrap={false}: satırın ortasından sayfa kesilmesin. React-PDF gerçek
    // metin yüksekliğini kendisi ölçtüğü için eski projedeki "tahmini
    // puanlama" sistemine artık hiç gerek yok.
    <View
      wrap={false}
      style={[
        styles.satir,
        index === 0 ? styles.ilkSatir : null,
        index === toplamSatir - 1 ? styles.sonSatir : null,
        index % 2 === 0 ? styles.satirAcik : styles.satirKoyu,
      ].filter(Boolean) as any}
    >
      <View style={[styles.hucre, { width: "19%" }]}>
        <Text style={styles.hucreEtiket}>Parametre</Text>
        <Text style={styles.hucreDeger}>{item.parametre}</Text>
      </View>

      <View style={[styles.hucre, { width: "13%" }]}>
        <Text style={styles.hucreEtiket}>Sonuç</Text>
        <Text style={[styles.hucreDeger, styles.hucreDegerKoyu]}>
          {item.deger} {item.birim}
        </Text>
      </View>

      <View style={[styles.hucre, { width: "19%" }]}>
        <Text style={styles.hucreEtiket}>Referans</Text>
        <Text style={[styles.hucreDeger, styles.hucreDegerKoyu]}>
          {item.referans || "Belirtilmemiş"}
        </Text>
      </View>

      <View style={[styles.hucre, styles.durumAlani, { width: "13%" }]}>
        <Text style={durumRozetStil(item.durum)}>{DURUM_ETIKET[item.durum]}</Text>
      </View>

      <View style={[styles.hucre, styles.hucreSon, { width: "36%" }]}>
        <Text style={styles.yorumMetni}>{item.yorum}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerMetin}>
        Geropital Evde Sağlık ve Bakım Merkezi · Yapay zekâ destekli kurum içi
        ön değerlendirme raporu
      </Text>
      <Text
        style={styles.footerMetin}
        render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ----------------------------------------------------------------------
// ANA BELGE
// ----------------------------------------------------------------------
export function KanTahliliPdfBelgesi({
  sonuc,
  fontYollari = TARAYICI_FONT_YOLLARI,
  logo,
}: {
  sonuc: AnalizSonucu;
  fontYollari?: FontYollari;
  logo?: string | Buffer | null;
}) {
  fontlariKaydet(fontYollari);

  const gruplar = kategorilereGoreGrupla(sonuc.parametreler || []);
  const bugun = new Date().toLocaleDateString("tr-TR");

  return (
    <Document
      title={`${sonuc.hastaBilgisi?.adSoyad || "Hasta"} - Kan Tahlili Raporu`}
      author="Geropital Evde Sağlık ve Bakım Merkezi"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* ============ KAPAK SAYFASI ============ */}
        <View style={styles.headerKutu}>
          {logo && (
            <View style={styles.logoAlani}>
              <Image src={logo} style={styles.logo} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.kurumEtiket}>Geropital Klinik Analiz Paneli</Text>
            <Text style={styles.baslik}>Kan Tahlili Değerlendirmesi</Text>
            <Text style={styles.altBaslik}>
              Laboratuvar sonuçları klinik ön değerlendirme raporu
            </Text>
          </View>
        </View>

        <View style={styles.kurumSatiri}>
          <Text style={styles.kurumSutun}>
            Sağlık Bakanlığı Ruhsat tarih sayısı: 28.03.2022/09
          </Text>
          <Text style={styles.kurumSutun}>
            Osman Gazi Mah. İbrahim Etem Cad. No:52/A
          </Text>
          <Text style={[styles.kurumSutun, { marginRight: 0 }]}>
            0232 33 22 112 · www.geropital.com
          </Text>
        </View>

        <View style={styles.kutuSatiri}>
          <View style={styles.kutu}>
            <Text style={styles.kutuEtiket}>Hasta</Text>
            <Text style={styles.kutuDeger}>
              {sonuc.hastaBilgisi?.adSoyad || "Belirtilmemiş"}
            </Text>
          </View>
          <View style={styles.kutu}>
            <Text style={styles.kutuEtiket}>TC Kimlik</Text>
            <Text style={styles.kutuDeger}>
              {sonuc.hastaBilgisi?.tcKimlik || "Belirtilmemiş"}
            </Text>
          </View>
          <View style={styles.kutu}>
            <Text style={styles.kutuEtiket}>Yaş</Text>
            <Text style={styles.kutuDeger}>
              {sonuc.hastaBilgisi?.yas || "Belirtilmemiş"}
            </Text>
          </View>
          <View style={styles.kutu}>
            <Text style={styles.kutuEtiket}>Cinsiyet</Text>
            <Text style={styles.kutuDeger}>
              {sonuc.hastaBilgisi?.cinsiyet || "Belirtilmemiş"}
            </Text>
          </View>
          <View style={[styles.kutu, styles.kutuSonSutun]}>
            <Text style={styles.kutuEtiket}>Rapor Tarihi</Text>
            <Text style={styles.kutuDeger}>
              {sonuc.hastaBilgisi?.raporTarihi || bugun}
            </Text>
          </View>
        </View>

        <View style={styles.kutuSatiri}>
          <View style={styles.ozetKutu}>
            <Text style={styles.ozetSayi}>{sonuc.ozet?.toplamParametre || 0}</Text>
            <Text style={styles.ozetEtiket}>Toplam</Text>
          </View>
          <View style={styles.ozetKutu}>
            <Text style={styles.ozetSayi}>{sonuc.ozet?.normalSayisi || 0}</Text>
            <Text style={styles.ozetEtiket}>Normal</Text>
          </View>
          <View style={styles.ozetKutu}>
            <Text style={styles.ozetSayi}>{sonuc.ozet?.dusukSayisi || 0}</Text>
            <Text style={styles.ozetEtiket}>Düşük</Text>
          </View>
          <View style={styles.ozetKutu}>
            <Text style={styles.ozetSayi}>{sonuc.ozet?.yuksekSayisi || 0}</Text>
            <Text style={styles.ozetEtiket}>Yüksek</Text>
          </View>
          <View style={[styles.ozetKutu, styles.kutuSonSutun]}>
            <Text style={styles.ozetSayi}>{sonuc.ozet?.kritikSayisi || 0}</Text>
            <Text style={styles.ozetEtiket}>Kritik</Text>
          </View>
        </View>

        <View style={styles.genelKutu} wrap={false}>
          <Text style={styles.h2}>Genel Değerlendirme</Text>
          <Text style={styles.paragraf}>{sonuc.genelDegerlendirme}</Text>
        </View>

        {sonuc.degerlendirenKisi ? (
          <Text style={styles.degerlendirenSatiri}>
            Değerlendiren: {sonuc.degerlendirenKisi}
          </Text>
        ) : null}

        {/* Kategori bölümü kapaktan sonra yeni sayfada, tek bir başlıkla
            temiz başlar; sonra gruplar akış halinde dizilir. */}
        <View break>
          <Text style={styles.bolumBasligi}>Laboratuvar Bulguları</Text>
          <Text style={styles.bolumAltBasligi}>
            Sonuçlar kan gruplarına göre sınıflandırılmıştır
          </Text>
        </View>

        {/* ============ KATEGORİLER - SIRAYLA, AKIŞ HALİNDE ============ */}
        {/* Gruplar sırayla dizilir. Her kategori başlığı, altındaki ilk
            satırla birlikte "bölünmez" bir blok (wrap={false}) olarak
            tutulur - böylece başlık bir sayfada, satırları başka sayfada
            kalıp "bindirme/karışma" hissi vermez. Grup büyükse kalan
            satırlar doğal akışla devam eder; küçük gruplar aynı sayfada
            alt alta dizilerek gereksiz boşluk bırakmaz. */}
        {gruplar.map((grup) => {
          const [ilkSatir, ...digerSatirlar] = grup.parametreler;

          return (
            <View key={grup.kategori} style={styles.kategoriBlok}>
              <View wrap={false}>
                <View style={styles.kategoriSayfaBaslik}>
                  <KategoriIkonu kategori={grup.kategori} />
                  <View>
                    <Text style={styles.kategoriSayfaBaslikMetin}>{grup.kategori}</Text>
                    <Text style={styles.kategoriSayfaAltMetin}>
                      {grup.parametreler.length} parametre · Sonuçlar ve kısa yorumlar
                    </Text>
                  </View>
                </View>

                {ilkSatir && (
                  <ParametreSatiri
                    item={ilkSatir}
                    index={0}
                    toplamSatir={grup.parametreler.length}
                  />
                )}
              </View>

              {digerSatirlar.map((item, index) => (
                <ParametreSatiri
                  key={`${grup.kategori}-${item.parametre}-${index + 1}`}
                  item={item}
                  index={index + 1}
                  toplamSatir={grup.parametreler.length}
                />
              ))}
            </View>
          );
        })}

        {/* ============ KLİNİK NOTLAR - AYRI SAYFA ============ */}
        <View break>
          <Text style={styles.bolumBasligi}>Değerlendirme ve Tedavi Notları</Text>
          <Text style={styles.bolumAltBasligi}>
            Klinik takip planı, tedavi notları ve uyarılar
          </Text>

          <View style={[styles.notBaslikKutu, { marginTop: 8 }]} wrap={false}>
            <Text style={styles.h2}>Rapor Sonu Klinik Değerlendirme</Text>
            <Text style={styles.paragraf}>
              Bu bölüm, kan tahlili sonuçlarının takip planı, tedavi notları
              ve manuel not alanı için hazırlanmıştır.
            </Text>
          </View>

          <View style={[styles.notKutu, { marginTop: 12 }]} wrap={false}>
            <Text style={[styles.h2, { marginBottom: 6 }]}>Tedavi ve Takip Notları</Text>
            {(sonuc.tedaviNotlari || []).map((madde, index) => (
              <Text key={index} style={styles.notMadde}>
                • {madde}
              </Text>
            ))}
          </View>

          <View
            style={[styles.notKutu, { marginTop: 12, backgroundColor: "#fffbeb" }]}
            wrap={false}
          >
            <Text style={[styles.h2, { marginBottom: 6 }]}>Uyarı</Text>
            <Text style={styles.notMadde}>{sonuc.uyariMesaji}</Text>
          </View>

          {/* Editörde eklenen ekstra öğeler */}
          <EkOgeler ogeler={sonuc.ekOgeler || []} />

          {sonuc.degerlendirenKisi ? (
            <Text style={styles.degerlendirenSatiri}>
              Değerlendiren: {sonuc.degerlendirenKisi}
            </Text>
          ) : null}
        </View>

        <Footer />
      </Page>
    </Document>
  );
}