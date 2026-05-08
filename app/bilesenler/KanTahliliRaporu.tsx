type Durum = "normal" | "dusuk" | "yuksek" | "kritik";

type HastaBilgisi = {
  adSoyad: string;
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
  durum: Durum;
  kategori: string;
  yorum: string;
};

type AnalizSonucu = {
  hastaBilgisi: HastaBilgisi;
  ozet: Ozet;
  parametreler: Parametre[];
  genelDegerlendirme: string;
  oneriler: string[];
  uyariMesaji: string;
};

type Props = {
  sonuc: AnalizSonucu;
  parametreler: Parametre[];
};

function durumYazi(durum: Durum) {
  if (durum === "normal") return "Normal";
  if (durum === "dusuk") return "Düşük";
  if (durum === "yuksek") return "Yüksek";
  return "Kritik";
}

function durumRenk(durum: Durum) {
  if (durum === "normal") return "text-emerald-700";
  if (durum === "dusuk") return "text-sky-700";
  if (durum === "yuksek") return "text-orange-700";
  return "text-red-700";
}

export default function KanTahliliRaporu({ sonuc, parametreler }: Props) {
  return (
    <div className="bg-white p-8 text-slate-900">
      <div className="border-b-4 border-[#0097a7] pb-5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/logoGeropital.png"
              alt="Geropital Logo"
              className="h-20 w-20 object-contain"
            />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0097a7]">
                Geropital Klinik Analiz Paneli
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Kan Tahlili Klinik Ön Değerlendirme Raporu
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Yapay zekâ destekli laboratuvar ön değerlendirme çıktısı
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#0097a7]/20 bg-[#e8fbfd] px-4 py-3 text-right text-sm">
            <p className="font-semibold text-[#007c89]">Rapor Formatı</p>
            <p className="text-slate-600">Kurumsal PDF Çıktısı</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Hasta</p>
          <p className="mt-1 font-semibold">
            {sonuc.hastaBilgisi?.adSoyad || "Belirtilmemiş"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Yaş</p>
          <p className="mt-1 font-semibold">
            {sonuc.hastaBilgisi?.yas || "Belirtilmemiş"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Cinsiyet</p>
          <p className="mt-1 font-semibold">
            {sonuc.hastaBilgisi?.cinsiyet || "Belirtilmemiş"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Rapor Tarihi</p>
          <p className="mt-1 font-semibold">
            {sonuc.hastaBilgisi?.raporTarihi || "Belirtilmemiş"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold">{sonuc.ozet?.toplamParametre || 0}</p>
          <p className="text-xs text-slate-500">Toplam</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">
            {sonuc.ozet?.normalSayisi || 0}
          </p>
          <p className="text-xs text-slate-500">Normal</p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
          <p className="text-xl font-bold text-sky-700">
            {sonuc.ozet?.dusukSayisi || 0}
          </p>
          <p className="text-xs text-slate-500">Düşük</p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
          <p className="text-xl font-bold text-orange-700">
            {sonuc.ozet?.yuksekSayisi || 0}
          </p>
          <p className="text-xs text-slate-500">Yüksek</p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-xl font-bold text-red-700">
            {sonuc.ozet?.kritikSayisi || 0}
          </p>
          <p className="text-xs text-slate-500">Kritik</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[#0097a7]/20 bg-[#e8fbfd] p-4">
        <h2 className="text-base font-bold text-[#007c89]">
          Genel Değerlendirme
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {sonuc.genelDegerlendirme}
        </p>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-bold text-slate-950">
          Laboratuvar Sonuçları
        </h2>

        <div className="overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-[#0097a7] text-white">
              <tr>
                <th className="border border-[#00818c] px-2 py-2 text-left">
                  Parametre
                </th>
                <th className="border border-[#00818c] px-2 py-2 text-left">
                  Sonuç
                </th>
                <th className="border border-[#00818c] px-2 py-2 text-left">
                  Referans
                </th>
                <th className="border border-[#00818c] px-2 py-2 text-left">
                  Durum
                </th>
                <th className="border border-[#00818c] px-2 py-2 text-left">
                  Kısa Yorum
                </th>
              </tr>
            </thead>

            <tbody>
              {parametreler.map((item, index) => (
                <tr key={index} className="align-top even:bg-slate-50">
                  <td className="border border-slate-200 px-2 py-2 font-semibold">
                    {item.parametre}
                    <div className="mt-0.5 text-[10px] font-normal text-slate-500">
                      {item.kategori || "Diğer"}
                    </div>
                  </td>

                  <td className="border border-slate-200 px-2 py-2">
                    {item.deger} {item.birim}
                  </td>

                  <td className="border border-slate-200 px-2 py-2">
                    {item.referans || "Belirtilmemiş"}
                  </td>

                  <td
                    className={`border border-slate-200 px-2 py-2 font-bold ${durumRenk(
                      item.durum
                    )}`}
                  >
                    {durumYazi(item.durum)}
                  </td>

                  <td className="border border-slate-200 px-2 py-2 text-slate-700">
                    {item.yorum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#0097a7]/20 bg-[#f0fdff] p-4">
          <h2 className="text-base font-bold text-[#007c89]">Öneriler</h2>

          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-700">
            {sonuc.oneriler?.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="text-base font-bold text-slate-950">Ek Notlar</h2>

          <p className="mt-3 text-xs leading-5 text-slate-700">
            {sonuc.uyariMesaji}
          </p>

          <p className="mt-3 text-xs leading-5 text-slate-700">
            Bu rapor yalnızca ön değerlendirme amaçlıdır. Klinik karar yerine
            geçmez. Sonuçlar hastanın şikayetleri, muayene bulguları, mevcut
            hastalıkları ve kullandığı ilaçlarla birlikte değerlendirilmelidir.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
        Geropital Evde Sağlık ve Bakım Hizmetleri · Yapay zekâ destekli kurum içi ön değerlendirme raporu
      </div>
    </div>
  );
}