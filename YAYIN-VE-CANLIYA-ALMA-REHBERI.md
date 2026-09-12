# 🚀 Shift Assist - Canlıya Alma ve Yayın Rehberi (v1.0.0)

Uygulamanın tüm mobil optimizasyonları, dokunmatik jestleri, marka ikonları, PWA service worker'ı, SEO dosyaları ve sunucu yapılandırmaları tamamlanmıştır.

Aşağıdaki popüler ve ücretsiz platformlardan dilediğinizi seçerek uygulamayı birkaç saniye içinde canlıya alabilirsiniz.

---

## 🌐 1. Canlıya Alma (Hosting) Seçenekleri

### Seçenek A: Firebase Hosting ile Canlıya Alma (Önerilen)
Firebase veritabanı ve kimlik doğrulama kullandığınız için en entegre seçenektir:

1. Terminalde Firebase CLI ile oturum açın:
   ```bash
   npx firebase login
   ```
2. Projenizi Firebase'e bağlayın (eğer daha önce yapmadıysanız):
   ```bash
   npx firebase use --add
   ```
3. Tek komutla canlıya yayınlayın:
   ```bash
   npx firebase deploy --only hosting
   ```
> `firebase.json` dosyası projenizde önceden hazırlanmıştır; tüm SPA yönlendirmeleri ve önbellek başlıkları otomatik olarak devreye girer.

---

### Seçenek B: Vercel ile Canlıya Alma
1. Terminalden doğrudan çalıştırın:
   ```bash
   npx vercel --prod
   ```
2. Sorulan soruları Enter ile onaylayın (Çıktı klasörü: `dist`). Saniyeler içinde ücretsiz `*.vercel.app` alan adınız hazır olacaktır.
> `vercel.json` SPA yönlendirmesi hazır durumdadır.

---

### Seçenek C: Cloudflare Pages veya Netlify ile Canlıya Alma
1. GitHub veya GitLab reponuzu Cloudflare Pages / Netlify paneline bağlayın.
2. Derleme ayarları:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
> `public/_redirects` dosyası sayesinde sayfa yenilemelerinde (F5) 404 hatası oluşmaz.

---

## 📱 2. Telefonlara Kurulum (PWA / Ana Ekrana Ekleme)

Uygulama canlıya alındıktan sonra mobil kullanıcılar tarayıcı adres çubuğuna gerek kalmadan yerel bir uygulama gibi kullanabilir:

### 🍎 Apple iPhone & iPad (iOS Safari)
1. Uygulama linkini Safari ile açın.
2. Alt araç çubuğundaki **Paylaş** (⬆️) simgesine dokunun.
3. Açılan menüden **"Ana Ekrana Ekle"** seçeneğini seçin.
4. Sağ üstteki **"Ekle"** butonuna basarak tamamlayın.
*(Artık ana ekranda özel Vardiya ikonuyla tam ekran ve internetsiz açılır).*

### 🤖 Android Telefonlar (Google Chrome / Samsung Internet)
1. Uygulamayı Chrome ile açın.
2. Menüdeki veya ayarlardaki **"Telefona Yükle"** butonuna dokunun veya sağ üstteki üç noktadan **"Uygulamayı Yükle"** seçeneğine basın.
3. Uygulama telefonun ana ekranına ve uygulama çekmecesine yerel bir APK gibi kurulacaktır.

---

## 🛡️ 3. Yayın Öncesi Tamamlanan Teknik Kontroller

- [x] **Yapay Zeka Tasarımlı Şeffaf Logo:** Arka planı silinmiş vektörel amblem (`logo.png`, `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`).
- [x] **PWA Service Worker:** 35 dosya ve Google Webfontları çevrimdışı önbelleğe alındı.
- [x] **iOS Telefon Formatlama Engeli:** Vardiya saatlerinin (`08:00 - 16:00`) arama linkine dönüşmesi engellendi (`format-detection: telephone=no`).
- [x] **Güvenli Alan (Safe Area Insets):** Dynamic Island, iPhone çentik ve Android alt gezinme çubuğu taşma koruması devrede.
- [x] **Haptik Titreşim:** Gün seçimi, ay geçişleri ve izin işlemlerinde dokunsal geri bildirim aktif.
- [x] **Arama Motoru Uyumluluğu (SEO):** `robots.txt` ve `sitemap.xml` dinamik olarak oluşturuldu.
- [x] **Kod Ayrıştırma (Bundle Splitting):** 500 kB üstü hiçbir büyük dosya kalmayacak şekilde optimize edildi.
