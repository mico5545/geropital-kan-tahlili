import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  AnalizSonucu,
  DURUM_ETIKET,
  Parametre,
  kategorilereGoreGrupla,
} from "../types/kanTahlili";
import {
  FontYollari,
  TARAYICI_FONT_YOLLARI,
  TARAYICI_LOGO,
} from "./kanTahliliPdfBelgesi";

// ----------------------------------------------------------------------
// Bu şablon, Geropital'in halihazırda kullandığı RESMİ rapor formatını
// taklit eder. Hem sunucuda (indirme) hem tarayıcıda (canlı önizleme)
// çalışır; font/logo dışarıdan parametre olarak gelir (fs/path yok).
// ----------------------------------------------------------------------

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

const RENK = {
  lacivert: "#16324f",
  teal: "#0097a7",
  gri: "#4b5563",
  griMetin: "#374151",
  acikGri: "#6b7280",
  border: "#d1d5db",
  yuksekMetin: "#b45309",
  dusukMetin: "#0369a1",
  kritikMetin: "#b91c1c",
};

function durumMetinRengi(durum: Parametre["durum"]) {
  if (durum === "kritik") return RENK.kritikMetin;
  if (durum === "yuksek") return RENK.yuksekMetin;
  if (durum === "dusuk") return RENK.dusukMetin;
  return RENK.griMetin;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    color: "#1f2937",
    paddingTop: 26,
    paddingBottom: 46,
    paddingHorizontal: 34,
    lineHeight: 1.4,
  },

  // --- Antet (her sayfada tekrarlanır) ---
  antet: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: RENK.teal,
    paddingBottom: 8,
    marginBottom: 4,
  },
  antetSol: { flexDirection: "column", maxWidth: "62%" },
  antetAdres: { fontSize: 6.8, color: RENK.acikGri, lineHeight: 1.35 },
  antetSag: { flexDirection: "row", alignItems: "center" },
  antetLogo: { width: 74, height: 32, objectFit: "contain", marginRight: 6 },
  antetMarka: { alignItems: "flex-end" },
  antetMarkaAd: { fontSize: 12, fontWeight: 700, color: RENK.lacivert, letterSpacing: 0.5 },
  antetMarkaAlt: { fontSize: 6.6, color: RENK.teal, fontWeight: 600, letterSpacing: 1 },

  // --- Hasta satırı ---
  hastaSatiri: {
    fontSize: 8.2,
    color: RENK.griMetin,
    marginTop: 6,
    marginBottom: 2,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: RENK.border,
  },
  hastaGuclu: { fontWeight: 700, color: RENK.lacivert },

  girisParagraf: {
    fontSize: 9,
    color: RENK.griMetin,
    marginTop: 8,
    marginBottom: 4,
  },

  // --- Kategori ---
  kategoriBaslik: {
    fontSize: 11,
    fontWeight: 700,
    color: RENK.lacivert,
    marginTop: 12,
    marginBottom: 5,
    textTransform: "uppercase",
  },

  madde: { flexDirection: "row", marginBottom: 3, paddingLeft: 2 },
  maddeIsaret: { width: 10, fontSize: 9.5, color: RENK.teal },
  maddeIcerik: { flex: 1 },
  maddeSatir: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" },
  maddeAd: { fontSize: 9.3, fontWeight: 700, color: "#111827" },
  maddeDeger: { fontSize: 9.3, fontWeight: 700 },
  maddeYorum: {
    fontSize: 8.8,
    color: RENK.griMetin,
    marginTop: 1.5,
    marginLeft: 8,
    lineHeight: 1.4,
  },
  maddeOk: { color: RENK.teal, fontWeight: 700 },

  yorumBlok: {
    marginTop: 5,
    marginBottom: 2,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: RENK.border,
  },
  yorumBaslik: { fontSize: 9, fontWeight: 700, color: RENK.lacivert },
  yorumMetin: { fontSize: 8.8, color: RENK.griMetin, marginTop: 2, lineHeight: 1.45 },

  // --- Genel değerlendirme / plan ---
  bolumBaslik: {
    fontSize: 12,
    fontWeight: 700,
    color: RENK.lacivert,
    marginTop: 14,
    marginBottom: 5,
  },
  planMadde: { flexDirection: "row", marginBottom: 4 },
  planNo: {
    width: 16,
    fontSize: 9,
    fontWeight: 700,
    color: RENK.teal,
  },
  planIcerik: { flex: 1, fontSize: 9, color: RENK.griMetin, lineHeight: 1.45 },

  imzaAlani: { marginTop: 18, alignItems: "flex-end" },
  imzaMetin: { fontSize: 9, color: RENK.griMetin },
  imzaMarka: { fontSize: 11, fontWeight: 700, color: RENK.lacivert, marginTop: 2 },

  uyariKutu: {
    marginTop: 14,
    padding: 8,
    backgroundColor: "#fffbeb",
    borderWidth: 0.5,
    borderColor: "#fde68a",
    borderRadius: 4,
  },
  uyariMetin: { fontSize: 7.8, color: "#78350f", lineHeight: 1.4 },

  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    borderTopWidth: 0.5,
    borderTopColor: RENK.border,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerMetin: { fontSize: 6.6, color: RENK.acikGri },
});

function Antet({
  sonuc,
  logo,
}: {
  sonuc: AnalizSonucu;
  logo?: string | Buffer | null;
}) {
  const h = sonuc.hastaBilgisi;

  return (
    <View fixed>
      <View style={styles.antet}>
        <View style={styles.antetSol}>
          <Text style={styles.antetAdres}>
            İbrahim Etem Cad. No:52/A Bayraklı/İZMİR
          </Text>
          <Text style={styles.antetAdres}>0232 33 22 112 · www.geropital.com</Text>
          <Text style={styles.antetAdres}>
            Sağlık Bakanlığı ruhsat tarih sayısı: 28.03.2022/09
          </Text>
        </View>
        <View style={styles.antetSag}>
          {logo && <Image src={logo} style={styles.antetLogo} />}
          <View style={styles.antetMarka}>
            <Text style={styles.antetMarkaAd}>GEROPITAL</Text>
            <Text style={styles.antetMarkaAlt}>EVDE SAĞLIK & BAKIM</Text>
          </View>
        </View>
      </View>

      <Text style={styles.hastaSatiri}>
        <Text style={styles.hastaGuclu}>Adı Soyadı: </Text>
        {h?.adSoyad || "-"}
        {"     "}
        <Text style={styles.hastaGuclu}>TCKN: </Text>
        {h?.tcKimlik || "-"}
        {"     "}
        <Text style={styles.hastaGuclu}>Cinsiyet/Yaş: </Text>
        {h?.cinsiyet || "-"}
        {h?.yas ? ` / ${h.yas}` : ""}
      </Text>
    </View>
  );
}

// Bir kategorinin ortak "Yorum:" metnini, o kategorideki parametrelerin
// yorumlarından derler. Modern şablonda her satırın kendi yorumu var;
// klasik şablonda ise kategori sonunda toplu bir "Yorum:" bloğu klasik
// Geropital formatına daha uygun. Referans-dışı olanların yorumlarını
// birleştiriyoruz (hepsi aynıysa tek sefer).
function kategoriYorumu(parametreler: Parametre[]): string {
  const onemliler = parametreler.filter((p) => p.durum !== "normal");
  const kaynak = onemliler.length > 0 ? onemliler : parametreler;

  const benzersiz: string[] = [];
  kaynak.forEach((p) => {
    const y = (p.yorum || "").trim();
    if (y && !benzersiz.includes(y)) benzersiz.push(y);
  });

  return benzersiz.join(" ");
}

export function KanTahliliKlasikBelgesi({
  sonuc,
  fontYollari = TARAYICI_FONT_YOLLARI,
  logo = TARAYICI_LOGO,
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
      title={`${sonuc.hastaBilgisi?.adSoyad || "Hasta"} - Değerlendirme Raporu`}
      author="Geropital Evde Sağlık ve Bakım Merkezi"
    >
      <Page size="A4" style={styles.page} wrap>
        <Antet sonuc={sonuc} logo={logo} />

        <Text style={styles.girisParagraf}>
          Sn. {sonuc.hastaBilgisi?.adSoyad || "hastamızın"} kan tahlili sonrası
          önemli laboratuvar değerleri, genel değerlendirmesi ve önerilen takip
          planı aşağıdaki gibidir.
        </Text>

        {/* Numaralı kategori blokları */}
        {gruplar.map((grup, grupIndex) => {
          const yorum = kategoriYorumu(grup.parametreler);

          return (
            <View key={grup.kategori} wrap={false}>
              <Text style={styles.kategoriBaslik}>
                {grupIndex + 1}. {grup.kategori}
              </Text>

              {grup.parametreler.map((item, i) => (
                <View key={`${grup.kategori}-${i}`} style={styles.madde}>
                  <Text style={styles.maddeIsaret}>•</Text>
                  <View style={styles.maddeIcerik}>
                    <View style={styles.maddeSatir}>
                      <Text style={styles.maddeAd}>{item.parametre}: </Text>
                      <Text
                        style={[
                          styles.maddeDeger,
                          { color: durumMetinRengi(item.durum) },
                        ]}
                      >
                        {item.deger} {item.birim}
                        {item.durum !== "normal"
                          ? ` (${DURUM_ETIKET[item.durum]})`
                          : ""}
                      </Text>
                    </View>
                    {item.yorum ? (
                      <Text style={styles.maddeYorum}>
                        <Text style={styles.maddeOk}>→ </Text>
                        {item.yorum}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}

              {yorum ? (
                <View style={styles.yorumBlok}>
                  <Text style={styles.yorumBaslik}>Yorum:</Text>
                  <Text style={styles.yorumMetin}>{yorum}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Genel Değerlendirme */}
        <View wrap={false}>
          <Text style={styles.bolumBaslik}>Genel Değerlendirme</Text>
          <Text style={styles.yorumMetin}>{sonuc.genelDegerlendirme}</Text>
        </View>

        {/* Önerilen Takip ve Tedavi Planı */}
        {(sonuc.tedaviNotlari || []).length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.bolumBaslik}>Önerilen Takip ve Tedavi Planı</Text>
            {sonuc.tedaviNotlari.map((madde, i) => (
              <View key={i} style={styles.planMadde} wrap={false}>
                <Text style={styles.planNo}>{i + 1}.</Text>
                <Text style={styles.planIcerik}>{madde}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Editörde eklenen ekstra öğeler */}
        {(sonuc.ekOgeler || []).length > 0 && (
          <View style={{ marginTop: 8 }}>
            {(sonuc.ekOgeler || []).map((oge) => {
              if (oge.tur === "baslik") {
                return (
                  <Text key={oge.id} style={styles.bolumBaslik} wrap={false}>
                    {oge.baslik}
                  </Text>
                );
              }
              if (oge.tur === "paragraf") {
                return (
                  <Text key={oge.id} style={styles.yorumMetin}>
                    {oge.metin}
                  </Text>
                );
              }
              if (oge.tur === "vurgu") {
                return (
                  <View key={oge.id} style={styles.yorumBlok} wrap={false}>
                    {oge.baslik ? (
                      <Text style={styles.yorumBaslik}>{oge.baslik}</Text>
                    ) : null}
                    <Text style={styles.yorumMetin}>{oge.metin}</Text>
                  </View>
                );
              }
              if (oge.tur === "liste") {
                return (
                  <View key={oge.id} style={{ marginTop: 3, marginBottom: 3 }} wrap={false}>
                    {(oge.maddeler || []).map((madde, i) => (
                      <Text key={i} style={styles.yorumMetin}>
                        • {madde}
                      </Text>
                    ))}
                  </View>
                );
              }
              if (oge.tur === "cubuk") {
                return (
                  <Text key={oge.id} style={styles.yorumMetin}>
                    {oge.baslik}: {oge.cubukDeger}
                  </Text>
                );
              }
              if (oge.tur === "ayrac") {
                return (
                  <View
                    key={oge.id}
                    style={{
                      marginVertical: 6,
                      borderBottomWidth: 0.5,
                      borderBottomColor: RENK.border,
                    }}
                  />
                );
              }
              return null;
            })}
          </View>
        )}

        {/* Uyarı */}
        {sonuc.uyariMesaji ? (
          <View style={styles.uyariKutu} wrap={false}>
            <Text style={styles.uyariMetin}>{sonuc.uyariMesaji}</Text>
          </View>
        ) : null}

        {/* İmza */}
        <View style={styles.imzaAlani} wrap={false}>
          <Text style={styles.imzaMetin}>
            {sonuc.hastaBilgisi?.raporTarihi || bugun}
          </Text>
          {sonuc.degerlendirenKisi ? (
            <Text style={styles.imzaMetin}>{sonuc.degerlendirenKisi}</Text>
          ) : null}
          <Text style={styles.imzaMetin}>Saygılarımızla</Text>
          <Text style={styles.imzaMarka}>Geropital</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerMetin}>
            Geropital Evde Sağlık ve Bakım Merkezi · Klinik ön değerlendirme raporu
          </Text>
          <Text
            style={styles.footerMetin}
            render={({ pageNumber, totalPages }) =>
              `Sayfa ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}