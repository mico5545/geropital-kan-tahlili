import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer sunucuda çalışır ve dosya sistemine (fontlar,
  // logo) erişir; Next.js'in otomatik bundle etmesini istemiyoruz.
  serverExternalPackages: ["@react-pdf/renderer"],

  // Vercel'e deploy edilirken /public/fonts altındaki TTF dosyalarının
  // ve logonun, PDF üreten serverless fonksiyonun paketine dahil
  // edildiğinden emin olur. Bu olmadan Vercel'de "font not found" gibi
  // hatalar alınabilir (yerelde çalışıp production'da bozulmasının
  // klasik sebeplerinden biri budur).
  outputFileTracingIncludes: {
    "/api/kan-tahlili-pdf": [
      "./public/fonts/**/*",
      "./public/logoGeropital.png",
    ],
  },
};

export default nextConfig;