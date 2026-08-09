import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  KanTahliliPdfBelgesi,
  FontYollari,
} from "../../lib/kanTahliliPdfBelgesi";
import { KanTahliliKlasikBelgesi } from "../../lib/kanTahliliKlasikBelgesi";
import { AnalizSonucu, SablonTuru } from "../../types/kanTahlili";

// React-PDF, dosya sistemine (font, logo) erişmesi gerektiği için
// Node.js runtime'ında çalışmalı - Edge runtime'da ÇALIŞMAZ.
export const runtime = "nodejs";
export const maxDuration = 60;

// Sunucuda font/logo'yu dosya sisteminden mutlak yol olarak veririz.
// (Tarayıcı önizlemesi ise public URL kullanır - bkz. lib/*.)
function sunucuFontYollari(): FontYollari {
  const klasor = path.join(process.cwd(), "public", "fonts");
  return {
    regular: path.join(klasor, "Inter-Regular.ttf"),
    medium: path.join(klasor, "Inter-Medium.ttf"),
    semibold: path.join(klasor, "Inter-SemiBold.ttf"),
    bold: path.join(klasor, "Inter-Bold.ttf"),
  };
}

function sunucuLogo(): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", "logoGeropital.png"));
  } catch {
    return null;
  }
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

  const temizTarih = tarih.replace(/[\/.]/g, "-");

  return dosyaAdiTemizle(`${hastaAdi} Kan Tahlili Sonuclari ${temizTarih}`);
}

// Gelen veriyi savunmacı biçimde doğrular; eksik alan varsa güvenli
// varsayılanlarla doldurur. Böylece kullanıcı formdaki metin alanlarını
// boşaltsa bile PDF üretimi çökmez.
function sonucuGuvenliHaleGetir(veri: any): AnalizSonucu {
  return {
    hastaBilgisi: {
      adSoyad: veri?.hastaBilgisi?.adSoyad || "",
      tcKimlik: veri?.hastaBilgisi?.tcKimlik || "",
      yas: veri?.hastaBilgisi?.yas || "",
      cinsiyet: veri?.hastaBilgisi?.cinsiyet || "",
      raporTarihi: veri?.hastaBilgisi?.raporTarihi || "",
    },
    ozet: {
      toplamParametre: veri?.ozet?.toplamParametre || 0,
      normalSayisi: veri?.ozet?.normalSayisi || 0,
      dusukSayisi: veri?.ozet?.dusukSayisi || 0,
      yuksekSayisi: veri?.ozet?.yuksekSayisi || 0,
      kritikSayisi: veri?.ozet?.kritikSayisi || 0,
    },
    parametreler: Array.isArray(veri?.parametreler)
      ? veri.parametreler.map((item: any) => ({
          parametre: item?.parametre || "Belirtilmemiş",
          deger: item?.deger || "",
          referans: item?.referans || "Belirtilmemiş",
          birim: item?.birim || "",
          durum: ["normal", "dusuk", "yuksek", "kritik"].includes(item?.durum)
            ? item.durum
            : "normal",
          kategori: item?.kategori || "Diğer",
          yorum: item?.yorum || "",
        }))
      : [],
    genelDegerlendirme: veri?.genelDegerlendirme || "",
    tedaviNotlari: Array.isArray(veri?.tedaviNotlari) ? veri.tedaviNotlari : [],
    uyariMesaji: veri?.uyariMesaji || "",
    degerlendirenKisi: veri?.degerlendirenKisi || "",
    ekOgeler: Array.isArray(veri?.ekOgeler) ? veri.ekOgeler : [],
  };
}

export async function POST(request: Request) {
  try {
    const gelenVeri = await request.json();
    const sonuc = sonucuGuvenliHaleGetir(gelenVeri);

    // Şablon türü gövdede "sablon" alanı olarak gelir; geçersiz/eksikse
    // varsayılan olarak "modern" kullanılır.
    const sablon: SablonTuru =
      gelenVeri?.sablon === "klasik" ? "klasik" : "modern";

    if (sonuc.parametreler.length === 0) {
      return NextResponse.json(
        { hata: "PDF oluşturmak için en az bir parametre gerekli." },
        { status: 400 }
      );
    }

    const fontYollari = sunucuFontYollari();
    const logo = sunucuLogo();

    const belge =
      sablon === "klasik"
        ? KanTahliliKlasikBelgesi({ sonuc, fontYollari, logo })
        : KanTahliliPdfBelgesi({ sonuc, fontYollari, logo });

    const pdfBuffer = await renderToBuffer(belge as any);

    const dosyaAdi = pdfDosyaAdiOlustur(sonuc);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${dosyaAdi}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("PDF ÜRETİM HATASI:", error);

    return NextResponse.json(
      {
        hata: "PDF oluşturulurken bir hata oluştu.",
        detay: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}