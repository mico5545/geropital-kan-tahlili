import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer sunucuda çalışır ve dosya sistemine (fontlar,
  // logo) erişir; Next.js'in otomatik bundle etmesini istemiyoruz.
  serverExternalPackages: ["@react-pdf/renderer"],

  // Vercel'e deploy edilirken /public/fonts altındaki TTF dosyalarının
  // ve logonun, PDF üreten serverless fonksiyonun paketine dahil
  // edildiğinden emin olur.
  outputFileTracingIncludes: {
    "/api/kan-tahlili-pdf": [
      "./public/fonts/**/*",
      "./public/logoGeropital.png",
    ],
  },

  // @react-pdf/renderer'ın TARAYICI sürümü (canlı önizleme için) içindeki
  // pdfkit, "pako/lib/zlib/*.js" gibi alt-yolları çözemiyor ("Module not
  // found: pako/lib/zlib/zstream.js"). Bu bilinen bir uyumsuzluk; webpack
  // alias ile pako'nun ana giriş noktasına yönlendirerek çözüyoruz.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pako/lib/zlib/zstream.js": "pako",
      "pako/lib/zlib/deflate.js": "pako",
      "pako/lib/zlib/inflate.js": "pako",
      "pako/lib/zlib/constants.js": "pako",
    };
    return config;
  },
};

export default nextConfig;