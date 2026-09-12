# 📱 Vardiya Takip - Mobil Geliştirme ve Önizleme Rehberi

Bu rehber, **Vardiya Takip** uygulamasını telefonunuzda test etmeniz, hem evde hem dışarıda canlı önizlemeniz ve doğrudan telefonunuzdan kod geliştirebilmeniz için hazırlanmıştır.

---

## 🚀 1. Hızlı Başlatma (Tek Tıkla)

Proje klasöründeki şu dosyalara çift tıklayarak anında başlatabilirsiniz:

1. **`BASLAT-MOBIL-ONIZLEME.bat`**:
   - Geliştirme sunucusunu ve Cloudflare tünelini açar.
   - Ekrana telefonunuzla tarayabileceğiniz **QR kodları** basar.
2. **`BASLAT-KOD-TUNELI.bat`**:
   - Telefonunuzdan kod yazabilmeniz için güvenli VS Code tünelini başlatır.

Alternatif olarak terminalden:
```bash
npm run dev:mobile   # Önizleme ve tüneli başlatır
npm run dev:tunnel   # VS Code uzaktan kod tünelini başlatır
```

---

## 🏠 2. Evde Önizleme (Aynı Wi-Fi Ağı)

* **Koşul**: Bilgisayarınız ve telefonunuz aynı Wi-Fi / yerel ağa bağlı olmalıdır.
* **Nasıl Girilir?**:
  - `BASLAT-MOBIL-ONIZLEME.bat` çalıştırıldığında terminalde çıkan **"1. EVDE / AYNI WI-FI AĞINDA"** başlığı altındaki QR kodu telefonunuzun kamerasıyla okutun veya `http://192.168.1.11:5173` adresine girin.
* **Avantajı**:
  - Çok hızlıdır, bilgisayarda veya telefonda kodda yaptığınız değişiklikler Hot Module Replacement (HMR) sayesinde sayfayı yenilemeden anında ekrana yansır.

---

## 🌍 3. Dışarıda Önizleme (Mobil Veri / Farklı Ağlar)

* **Koşul**: Bilgisayarınız açık ve internete bağlı olmalıdır.
* **Nasıl Girilir?**:
  - `BASLAT-MOBIL-ONIZLEME.bat` çıktısındaki **"2. DIŞARIDA / MOBİL VERİDE"** başlığı altındaki QR kodu okutun veya `https://xxxx.trycloudflare.com` adresini telefonunuzda açın.
* **Avantajı**:
  - Port açma veya statik IP gerekmez, tamamen ücretsizdir.
  - **HTTPS** korumalı olduğu için mobil tarayıcınız uygulamanın **PWA (Progressive Web App)** özelliklerini tam destekler.
  - **Ana Ekrana Ekleme**:
    - **iOS (Safari)**: Paylaş butonuna dokunun -> *"Ana Ekrana Ekle"* seçin.
    - **Android (Chrome)**: Üç nokta menüsüne dokunun -> *"Uygulamayı Yükle"* veya *"Ana Ekrana Ekle"* seçin.
  - Uygulama artık telefonunuzda yerel bir mobil uygulama gibi simge olarak duracak ve tam ekran çalışacaktır.

---

## 💻 4. Telefonda Kod Geliştirme (VS Code Remote Web)

Telefonunuz yanınızdayken dışarıda veya uzaktayken projenin kodlarını doğrudan düzenlemek için:

1. Bilgisayarınızda `BASLAT-KOD-TUNELI.bat` dosyasını çalıştırın (veya `code tunnel`).
   - *(İlk çalıştırmada sizden bir defaya mahsus GitHub veya Microsoft hesabınızla giriş yapmanızı ve ekrandaki kodu onaylamanızı isteyecektir).*
2. Telefonunuzun tarayıcısından (Safari / Chrome):
   👉 **[https://vscode.dev](https://vscode.dev)** adresine gidin.
3. Aynı GitHub/Microsoft hesabınızla oturum açın ve **"Remote - Tunnels"** sekmesinden bilgisayarınızı seçin.
4. **Sonuç**:
   - Telefonunuzda tam donanımlı VS Code arayüzü açılır.
   - Dosyaları açıp kod değiştirebilir, kaydedebilirsiniz.
   - Telefonunuzdan kaydettiğiniz kod anında PC'de güncellenir ve dışarıdaki önizleme adresinizde (`trycloudflare.com`) canlı olarak yenilenir!
