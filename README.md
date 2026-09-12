# ⏱️ Shift Assist

<div align="center">
  <img src="public/logo.png" alt="Shift Assist Logo" width="120" height="120" />
  <h3>Modern, Akıllı Vardiya ve İzin Planlama Uygulaması</h3>
  <p>Apple iOS Safari, Android ve Masaüstü için Progressive Web App (PWA)</p>

  [![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Dexie.js](https://img.shields.io/badge/Dexie.js-IndexedDB-blue)](https://dexie.org/)
  [![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
</div>

---

## ✨ Özellikler

- 📱 **Mobil & Dokunmatik Ergonomi (PWA)**:
  - iOS Dynamic Island, çentik ve alt navigasyon çubuğu güvenli alan (`safe-area-inset`) koruması.
  - Yatay parmak kaydırma (Swipe) ile aylar arası akıcı geçiş.
  - Gün detay kartında aşağı çekerek kapatma (Pull down to dismiss) jesti.
  - Dokunmatik haptik titreşim geri bildirimi (`navigator.vibrate`).
  - Safari otomatik zoom engellemesi ve dokunma flaşı temizliği.
- ⚡ **Offline-First & Yerel Veri Tabanı**:
  - Dexie.js (IndexedDB) mimarisi sayesinde internet bağlantısı olmadan %100 işlevsel.
  - İstendiğinde Google ile giriş yaparak Firebase Cloud Firestore senkronizasyonu.
- 🔄 **Esnek Vardiya & Nöbet Döngüleri**:
  - Özel vardiya tipleri (saat aralıkları, özel renkler, ikonlar, molalar).
  - Çoklu gün vardiya döngüleri (ör. 2 Gündüz - 2 Gece - 2 İzin).
  - Özel gün istisnaları (+İzin, +Rapor, +Mazeret, Takas).
- 🏖️ **Akıllı Yıllık İzin Fırsat Planlayıcısı**:
  - Resmi ve dini tatilleri (Ramazan & Kurban Bayramı, 29 Ekim vb.) otomatik hesaplama.
  - Hafta sonları ve tatillerle birleşen en az izinle en çok tatil yaptıran köprü tatil fırsatları.
- 🌙 **Tema & Çoklu Dil**:
  - Sistem/Açık/Koyu tema desteği (parlama yapmayan antrasit gece modu).
  - Türkçe ve İngilizce arayüz desteği.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- [Node.js](https://nodejs.org/) (v18 veya üzeri)
- npm, pnpm veya yarn

### Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Sadece Vite geliştirme sunucusu için
npm run dev:vite
```

### Derleme (Production Build)

```bash
npm run build
```
Çıktılar `dist/` klasörüne oluşturulur, Service Worker ve PWA manifest otomatik paketlenir.

---

## 🌐 Vercel + GitHub Entegrasyonu ile Otomatik Yayın

Bu depo Vercel ile tam entegre çalışacak şekilde yapılandırılmıştır ([vercel.json](vercel.json)):

1. [Vercel](https://vercel.com) hesabınıza giriş yapın.
2. **"Add New Project"** -> **"Import Git Repository"** seçeneğine tıklayın.
3. `furkankostik-crypto/Shift-Assist` deposunu seçin.
4. Framework olarak **Vite** otomatik algılanacaktır.
5. *(Opsiyonel)* Cloud senkronizasyonu için **Environment Variables** bölümüne `.env.example` içerisindeki Firebase değişkenlerini ekleyin.
6. **Deploy** butonuna tıklayın!
7. Artık depoya her `git push` yaptığınızda Vercel otomatik olarak yeni sürümü derleyip canlıya alacaktır.

---

## 📦 Proje Yapısı

```
├── public/                 # PWA ikonları, robots.txt, sitemap.xml
├── scripts/                # Mobil geliştirme ve logo işleme scriptleri
├── src/
│   ├── components/         # PWA yükleme, takvim, navigasyon bileşenleri
│   ├── db/                 # Dexie.js yerel veritabanı şeması
│   ├── pages/              # Takvim, İzin Planlayıcı, Vardiyalar, Ayarlar
│   ├── services/           # Firebase Auth ve Firestore servisleri
│   ├── store/              # Zustand durum yönetimi
│   ├── utils/              # Haptikler, resmi tatiller, vardiya döngü algoritması
│   ├── i18n.ts             # Çoklu dil (TR/EN)
│   └── main.tsx            # Uygulama giriş noktası
├── vercel.json             # Vercel SPA rewrites & PWA cache başlıkları
└── vite.config.ts          # Vite & PWA Service Worker yapılandırması
```

---

## 📄 Lisans

MIT License.
