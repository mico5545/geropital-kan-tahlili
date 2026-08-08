import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { AnalizSonucu, Durum } from "../../types/kanTahlili";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonTemizle(metin: string) {
  return metin.replace(/```json/g, "").replace(/```/g, "").trim();
}

function kategoriBelirle(parametre: string) {
  const p = (parametre || "").toLowerCase();

  if (["wbc", "rbc", "hemoglobin", "hct", "plt", "mcv", "mch"].some((k) => p.includes(k))) {
    return "Hemogram";
  }

  if (["alt", "ast", "ggt", "bilirubin", "alkalen", "albumin"].some((k) => p.includes(k))) {
    return "Karaciğer";
  }

  if (["kreatinin", "üre", "bun", "gfr"].some((k) => p.includes(k))) {
    return "Böbrek";
  }

  if (["crp", "sedim", "esr", "hs-crp"].some((k) => p.includes(k))) {
    return "Enfeksiyon";
  }

  if (["psa", "cea", "ca"].some((k) => p.includes(k))) {
    return "Tümör Belirteçleri";
  }

  if (["vitamin", "b12", "folat", "d3", "d2", "d"].some((k) => p.includes(k))) {
    return "Vitamin Seviyeleri";
  }

  return "Genel Biyokimya";
}

export async function POST(request: Request) {
  try {
    const gelenApiKey = request.headers.get("x-gemini-api-key");
    const apiKey = gelenApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { hata: "GEMINI_API_KEY bulunamadı. .env.local dosyasını kontrol edin." },
        { status: 500 }
      );
    }

    const gemini = new GoogleGenAI({ apiKey });

    const formData = await request.formData();
    const dosya = formData.get("dosya") as File | null;

    if (!dosya) {
      return NextResponse.json({ hata: "PDF dosyası gönderilmedi." }, { status: 400 });
    }

    if (dosya.type !== "application/pdf") {
      return NextResponse.json(
        { hata: "Lütfen yalnızca PDF dosyası yükleyin." },
        { status: 400 }
      );
    }

    if (dosya.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { hata: "PDF dosyası çok büyük. Lütfen 15 MB altında bir PDF yükleyin." },
        { status: 400 }
      );
    }

    const arrayBuffer = await dosya.arrayBuffer();
    const base64Dosya = Buffer.from(arrayBuffer).toString("base64");
    const dosyaTarihi = new Date(dosya.lastModified).toLocaleDateString("tr-TR");

    // NOT (KVKK / gizlilik uyarısı):
    // Aşağıdaki prompt, TC Kimlik No'yu PDF'te geçtiği haliyle MASKELEMEDEN
    // döndürmesini istiyor. TC Kimlik No + sağlık verisinin bir arada,
    // maskesiz olarak işlenmesi/saklanması KVKK kapsamında özel nitelikli
    // veri sayılır ve ek yükümlülükler doğurur (açık rıza, veri güvenliği
    // tedbirleri, saklama süresi sınırı vb.). Bu davranışı bilerek
    // koruyorum çünkü kurum içi klinik ihtiyacınız bu yönde; ama Supabase'e
    // yazmadan önce bu alanı şifreli/maskeli saklamayı ya da erişimi
    // kısıtlamayı değerlendirmenizi öneririm.
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
- Tedavi notları kesin tedavi değil; hekim değerlendirmesi, takip, destek planı gibi güvenli ifadeler içersin.
- Tedavi notları en fazla 5 madde olsun.
- Uyarı mesajı kısa ve net olsun.
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
  ],

  ÇOK KRİTİK KURAL:
  - TC Kimlik numarası PDF içinde geçiyorsa TAM ve eksiksiz yaz.
  - Kesinlikle maskeleme yapma (**** gibi yazma).
  - 11 haneli olarak yaz.
  - TC bulunamazsa boş bırak.
  - Eğer TC PDF içinde zaten maskeli verilmişse (**** gibi) olduğu gibi ver;
    ama tam haliyle verilmişse tamamını ver.

  "genelDegerlendirme": "",
  "tedaviNotlari": [],
  "uyariMesaji": "Kan tahlili değerleri toplu olarak ve klinik değerlendirme ile anlamlıdır. Bu sistem teşhis koymaz; yalnızca bilgilendirme ve ön değerlendirme amacı taşır. Detaylı ve anlamlı değerlendirme için doktorunuza danışınız."
}
`;

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

    const hamMetin =
      cevap.text && typeof cevap.text === "string"
        ? cevap.text
        : cevap.text && typeof cevap.text === "function"
        ? await cevap.text()
        : "";

    if (!hamMetin) {
      return NextResponse.json(
        { hata: "Gemini boş yanıt döndürdü.", detay: "Response metni alınamadı." },
        { status: 500 }
      );
    }

    const temizMetin = jsonTemizle(hamMetin);

    let analizSonucu: any;

    try {
      analizSonucu = JSON.parse(temizMetin);
    } catch (parseError: any) {
      console.error("JSON Parse Hatası:", parseError.message);
      console.error("Temiz Metin:", temizMetin.substring(0, 500));

      return NextResponse.json(
        {
          hata: "Gemini sonucu JSON formatında döndüremedi.",
          detay: `Parse Hatası: ${parseError.message}. Ham Metin (İlk 200 char): ${temizMetin.substring(0, 200)}`,
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

    const gecerliDurumlar: Durum[] = ["normal", "dusuk", "yuksek", "kritik"];

    analizSonucu.parametreler = analizSonucu.parametreler.map((item: any) => ({
      parametre: item.parametre || "Belirtilmemiş",
      deger: item.deger || "",
      referans: item.referans || "Belirtilmemiş",
      birim: item.birim || "",
      durum: gecerliDurumlar.includes(item.durum) ? item.durum : "normal",
      kategori: item.kategori || kategoriBelirle(item.parametre),
      yorum:
        item.yorum ||
        (item.durum === "normal"
          ? "Referans aralığında."
          : "Klinik durumla birlikte değerlendirilmelidir."),
    }));

    const normalSayisi = analizSonucu.parametreler.filter((i: any) => i.durum === "normal").length;
    const dusukSayisi = analizSonucu.parametreler.filter((i: any) => i.durum === "dusuk").length;
    const yuksekSayisi = analizSonucu.parametreler.filter((i: any) => i.durum === "yuksek").length;
    const kritikSayisi = analizSonucu.parametreler.filter((i: any) => i.durum === "kritik").length;

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

    if (!Array.isArray(analizSonucu.tedaviNotlari)) {
      analizSonucu.tedaviNotlari = [
        "Bu rapor kesin tedavi planı yerine geçmez.",
        "Destek veya takip planı için hekim değerlendirmesi önerilir.",
        "İlaç, takviye veya doz planlaması yalnızca doktor tarafından yapılmalıdır.",
      ];
    }

    if (!analizSonucu.uyariMesaji) {
      analizSonucu.uyariMesaji =
        "Kan tahlili değerleri toplu olarak ve klinik değerlendirme ile anlamlıdır. Bu sistem teşhis koymaz; yalnızca bilgilendirme ve ön değerlendirme amacı taşır. Detaylı ve anlamlı değerlendirme için doktorunuza danışınız.";
    }

    // Bu alan Gemini tarafından doldurulmaz; admin panelinde personel
    // tarafından elle girilir. Tip tutarlılığı için boş başlatıyoruz.
    if (!analizSonucu.degerlendirenKisi) {
      analizSonucu.degerlendirenKisi = "";
    }

    return NextResponse.json(analizSonucu as AnalizSonucu);
  } catch (error: any) {
    console.error("KAN TAHLİLİ ANALİZ GERÇEK HATA:", error);

    const errorMessage = error?.message || String(error);
    const errorStatus = error?.status || 500;

    if (
      errorStatus === 429 ||
      errorMessage.includes("quota") ||
      errorMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      return NextResponse.json(
        {
          hata: "API Quota Hatası: Günlük limit aşıldı.",
          detay:
            "Sistem şu anda yoğun kullanımdadır. Lütfen birkaç saat sonra tekrar deneyin veya 'API Anahtarı' bölümünden kendi Gemini API anahtarınızı girerek devam edebilirsiniz.",
          onerilen:
            "Kendi Gemini API anahtarınız varsa, 'API Anahtarı' kısmına yapıştırıp 'Bağlan' butonuna tıklayın.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { hata: "Analiz sırasında hata oluştu.", detay: errorMessage },
      { status: errorStatus > 599 ? 500 : errorStatus }
    );
  }
}