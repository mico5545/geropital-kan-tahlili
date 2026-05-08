import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonTemizle(metin: string) {
  return metin.replace(/```json/g, "").replace(/```/g, "").trim();
}

function kategoriBelirle(parametre: string) {
  const p = parametre.toLowerCase();

  if (["wbc", "rbc", "hemoglobin", "hct"].some(k => p.includes(k))) {
    return "Hemogram";
  }

  if (["alt", "ast", "ggt"].some(k => p.includes(k))) {
    return "Karaciğer";
  }

  if (["kreatinin", "üre"].some(k => p.includes(k))) {
    return "Böbrek";
  }

  if (["crp", "sedim"].some(k => p.includes(k))) {
    return "Enfeksiyon";
  }

  if (["psa", "cea", "ca"].some(k => p.includes(k))) {
    return "Tümör Belirteçleri";
  }

  return "Genel Biyokimya";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          hata: "GEMINI_API_KEY bulunamadı. .env.local dosyasını kontrol edin.",
        },
        { status: 500 }
      );
    }

    const gemini = new GoogleGenAI({ apiKey });

    const formData = await request.formData();
    const dosya = formData.get("dosya") as File | null;

    if (!dosya) {
      return NextResponse.json(
        { hata: "PDF dosyası gönderilmedi." },
        { status: 400 }
      );
    }

    if (dosya.type !== "application/pdf") {
      return NextResponse.json(
        { hata: "Lütfen yalnızca PDF dosyası yükleyin." },
        { status: 400 }
      );
    }

    if (dosya.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        {
          hata: "PDF dosyası çok büyük. Lütfen 15 MB altında bir PDF yükleyin.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await dosya.arrayBuffer();
    const base64Dosya = Buffer.from(arrayBuffer).toString("base64");

    // Dosya yükleme tarihini Türkçe formatına çevir
    const dosyaTarihi = new Date(dosya.lastModified).toLocaleDateString("tr-TR");

    const prompt = `
Sen kurum içinde kullanılan profesyonel bir kan tahlili ön değerlendirme sistemisin.

PDF içindeki laboratuvar sonuçlarını oku.
Her parametreyi kendi referans aralığına göre değerlendir.

ÇOK ÖNEMLİ:
Sadece geçerli JSON döndür.
JSON dışında hiçbir açıklama yazma.
Markdown kullanma.
Kod bloğu kullanma.

Kurallar:
- Teşhis koyma.
- Kesin tedavi yazma.
- İlaç dozu verme.
- Gereksiz tıbbi makale dili kullanma.
- Her parametre için kısa ve net yorum yap.
- Normal değerlerde sadece "Referans aralığında." yaz.
- Düşük/yüksek/kritik değerlerde kısa klinik anlam yaz.
- Genel değerlendirme en az 3, en fazla 5 cümle olsun.
- Genel değerlendirme hasta yakınının anlayacağı sade dilde olsun.
- Değerlendirme maddeleri en fazla 5 madde olsun.
- Tedavi notları kesin tedavi değil; hekim değerlendirmesi, takip, destek planı gibi güvenli ifadeler içersin.
- Tedavi notları en fazla 5 madde olsun.
- Ek not kısa ve uyarı niteliğinde olsun.
- Eğer hasta bilgisi bulunamazsa boş string kullan.
- Eğer birim bulunamazsa boş string kullan.
- Eğer referans aralığı bulunamazsa "Belirtilmemiş" yaz.
- Türkçe karakterleri doğru kullan.

Durum alanı sadece şu değerlerden biri olabilir:
normal
dusuk
yuksek
kritik

JSON formatı kesinlikle şöyle olmalı:

{
  "hastaBilgisi": {
    "adSoyad": "",
    "tcKimlik": "",
    "yas": "",
    "cinsiyet": "",
    "raporTarihi": ""
  },
  "ozet": {
    "toplamParametre": 0,
    "normalSayisi": 0,
    "dusukSayisi": 0,
    "yuksekSayisi": 0,
    "kritikSayisi": 0
  },
  "parametreler": [
    {
      "parametre": "",
      "deger": "",
      "referans": "",
      "birim": "",
      "durum": "normal",
      "kategori": "",
      "yorum": ""
    }
  
  ÇOK KRİTİK KURAL:
- TC Kimlik numarası PDF içinde geçiyorsa TAM ve eksiksiz yaz.
- Kesinlikle maskeleme yapma (**** gibi yazma).
- 11 haneli olarak yaz.
- TC bulunamazsa boş bırak.
  eğer tc maskeleme ile verildiyese öyle ver ama tamamı verildiyse tmamını ver.
  
    ],


  "genelDegerlendirme": "",
  "degerlendirmeMaddeleri": [],
  "tedaviNotlari": [],
  "ekNot": "Kan tahlili değerleri toplu olarak ve klinik değerlendirme ile anlamlıdır. Bu sistem teşhis koymaz; yalnızca bilgilendirme ve ön değerlendirme amacı taşır. Detaylı ve anlamlı değerlendirme için doktorunuza danışınız.",
  "uyariMesaji": "Kan tahlili değerleri toplu olarak ve klinik değerlendirme ile anlamlıdır. Bu sistem teşhis koymaz; yalnızca bilgilendirme ve ön değerlendirme amacı taşır. Detaylı ve anlamlı değerlendirme için doktorunuza danışınız."
}
`



;

    const modeller = ["gemini-2.5-flash", "gemini-2.0-flash"];

    let cevap: any = null;
    let sonModelHatasi = "";

    for (const model of modeller) {
      try {
        cevap = await gemini.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Dosya,
                  },
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        break;
      } catch (error: any) {
        sonModelHatasi = error?.message || String(error);

        const yogunlukHatasi =
          sonModelHatasi.includes("503") ||
          sonModelHatasi.includes("UNAVAILABLE") ||
          sonModelHatasi.toLowerCase().includes("high demand");

        if (!yogunlukHatasi) {
          throw error;
        }
      }
    }

    if (!cevap) {
      return NextResponse.json(
        {
          hata: "Gemini şu anda yoğun. Lütfen birkaç dakika sonra tekrar deneyin.",
          detay: sonModelHatasi,
        },
        { status: 503 }
      );
    }

    const hamMetin = cevap.text || "";
    const temizMetin = jsonTemizle(hamMetin);

    let analizSonucu;

    try {
      analizSonucu = JSON.parse(temizMetin);
    } catch {
      return NextResponse.json(
        {
          hata: "Gemini sonucu JSON formatında döndüremedi.",
          detay: temizMetin,
        },
        { status: 500 }
      );
    }

  if (!analizSonucu.hastaBilgisi) {
  analizSonucu.hastaBilgisi = {
    adSoyad: "",
    tcKimlik: "",
    yas: "",
    cinsiyet: "",
    raporTarihi: "",
  };
}

analizSonucu.hastaBilgisi = {
  adSoyad: analizSonucu.hastaBilgisi.adSoyad || "",
  tcKimlik: analizSonucu.hastaBilgisi.tcKimlik || "",
  yas: analizSonucu.hastaBilgisi.yas || "",
  cinsiyet: analizSonucu.hastaBilgisi.cinsiyet || "",
  raporTarihi: analizSonucu.hastaBilgisi.raporTarihi || dosyaTarihi,
};

    if (!Array.isArray(analizSonucu.parametreler)) {
      return NextResponse.json(
        {
          hata: "PDF içinden laboratuvar parametreleri okunamadı.",
          detay: analizSonucu,
        },
        { status: 500 }
      );
    }

    analizSonucu.parametreler = analizSonucu.parametreler.map((item: any) => ({
      parametre: item.parametre || "Belirtilmemiş",
      deger: item.deger || "",
      referans: item.referans || "Belirtilmemiş",
      birim: item.birim || "",
      durum: ["normal", "dusuk", "yuksek", "kritik"].includes(item.durum)
        ? item.durum
        : "normal",
      kategori: item.kategori || kategoriBelirle(item.parametre),
      yorum:
        item.yorum ||
        (item.durum === "normal"
          ? "Referans aralığında."
          : "Klinik durumla birlikte değerlendirilmelidir."),
    }));

    const normalSayisi = analizSonucu.parametreler.filter(
      (item: any) => item.durum === "normal"
    ).length;

    const dusukSayisi = analizSonucu.parametreler.filter(
      (item: any) => item.durum === "dusuk"
    ).length;

    const yuksekSayisi = analizSonucu.parametreler.filter(
      (item: any) => item.durum === "yuksek"
    ).length;

    const kritikSayisi = analizSonucu.parametreler.filter(
      (item: any) => item.durum === "kritik"
    ).length;

    analizSonucu.ozet = {
      toplamParametre: analizSonucu.parametreler.length,
      normalSayisi,
      dusukSayisi,
      yuksekSayisi,
      kritikSayisi,
    };

    if (!analizSonucu.genelDegerlendirme) {
      analizSonucu.genelDegerlendirme =
        "Kan tahlili sonuçları referans aralıklarıyla birlikte ön değerlendirmeye alınmıştır. Referans dışı değerler klinik durumla birlikte yorumlanmalıdır. Sonuçlar tek başına tanı koydurmaz; yaş, şikayet, ilaç kullanımı ve mevcut hastalıklarla birlikte değerlendirilmelidir.";
    }

    if (!Array.isArray(analizSonucu.degerlendirmeMaddeleri)) {
      analizSonucu.degerlendirmeMaddeleri = [
        "Referans dışı değerler klinik durumla birlikte değerlendirilmelidir.",
        "Normal değerler mevcut klinik tabloya göre anlam kazanır.",
        "Gerekli durumlarda hekim kontrolü önerilir.",
      ];
    }

    if (!Array.isArray(analizSonucu.tedaviNotlari)) {
      analizSonucu.tedaviNotlari = [
        "Bu rapor kesin tedavi planı yerine geçmez.",
        "Destek veya takip planı için hekim değerlendirmesi önerilir.",
        "İlaç, takviye veya doz planlaması yalnızca doktor tarafından yapılmalıdır.",
      ];
    }

    if (!analizSonucu.ekNot) {
      analizSonucu.ekNot =
        "Kan tahlili değerleri toplu olarak ve klinik değerlendirme ile anlamlıdır. Detaylı değerlendirme için doktorunuza danışınız.";
    }

    if (!analizSonucu.uyariMesaji) {
      analizSonucu.uyariMesaji =
        "Kan tahlili değerleri toplu olarak ve klinik değerlendirme ile anlamlıdır. Bu sistem teşhis koymaz; yalnızca bilgilendirme ve ön değerlendirme amacı taşır. Detaylı ve anlamlı değerlendirme için doktorunuza danışınız.";
    }

    return NextResponse.json(analizSonucu);
  } catch (error: any) {
    console.error("KAN TAHLİLİ ANALİZ GERÇEK HATA:", error);

    return NextResponse.json(
      {
        hata: "Analiz sırasında hata oluştu.",
        detay: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}