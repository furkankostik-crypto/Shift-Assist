# 🚀 Shift Assist - Canlıya Alma ve Yayın Rehberi (v1.1.0)

Uygulamanın tüm mobil optimizasyonları, dokunmatik jestleri, marka ikonları, PWA service worker'ı, SEO dosyaları ve sunucu yapılandırmaları tamamlanmıştır.

Aşağıdaki popüler ve ücretsiz platformlardan dilediğinizi seçerek uygulamayı birkaç saniye içinde canlıya alabilirsiniz.

---

## 🌐 1. Canlıya Alma (Hosting): Vercel + GitHub Entegrasyonu (Önerilen)

GitHub deponuz (`furkankostik-crypto/Shift-Assist`) ile Vercel doğrudan entegre çalışacak şekilde yapılandırılmıştır. Depoya her yeni commit `git push` yaptığınızda Vercel otomatik olarak kodu derleyip yayına alacaktır.

### Adım Adım Kurulum:
1. [Vercel.com](https://vercel.com) adresine gidin ve **GitHub hesabınızla oturum açın**.
2. Dashboard ekranında sağ üstteki **"Add New..."** ➔ **"Project"** butonuna tıklayın.
3. Listeden **`Shift-Assist`** deponuzu bulun ve yanındaki **"Import"** butonuna basın.
4. Framework olarak **Vite** otomatik algılanacaktır:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. *(Opsiyonel)* Firebase kimlik doğrulama / bulut senkronizasyonu için **Environment Variables** bölümüne `.env.example` dosyasındaki değişkenleri ekleyin. *(Eklenmese bile uygulama Dexie.js ile %100 çevrimdışı çalışır).*
6. **"Deploy"** butonuna tıklayın.
7. Yaklaşık 15-20 saniye içinde Vercel size ücretsiz, global CDN ve SSL sertifikalı bir canlı bağlantı (`https://shift-assist.vercel.app`) sağlayacaktır!
8. `vercel.json` dosyasında yapılandırılan PWA önbellek başlıkları ve SPA yönlendirmeleri otomatik olarak devreye girer.

---

## 🌐 2. Diğer Canlıya Alma Seçenekleri (Alternatif)

### Seçenek B: Firebase Hosting
1. Terminalde: `npx firebase login`
2. Projeyi bağlayın: `npx firebase use --add`
3. Yayınlayın: `npx firebase deploy --only hosting`

### Seçenek C: Cloudflare Pages / Netlify
- GitHub reponuzu bağlayıp Build Command: `npm run build`, Output Directory: `dist` olarak ayarlayın. `public/_redirects` sayesinde 404 hatası oluşmaz.

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
