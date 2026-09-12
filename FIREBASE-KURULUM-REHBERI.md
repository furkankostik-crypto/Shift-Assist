# 🔥 Firebase Bulut Senkronizasyonu & Giriş Kurulum Rehberi

Uygulamanız artık **Google ile Tek Tıkla Giriş**, **E-posta & Şifre ile Üyelik** ve **Bulut Senkronizasyonu** desteklemektedir.  
Aşağıdaki adımları 3-5 dakika içinde tamamlayarak kendi Firebase projenizi canlıya bağlayabilirsiniz.

---

### Adım 1: Firebase Projesi Oluşturma
1. Tarayıcınızda [Firebase Console](https://console.firebase.google.com/) sayfasına gidin ve Google hesabınızla giriş yapın.
2. **"Proje Ekle" (Create a project)** butonuna tıklayın.
3. Projenize bir isim verin (Örn: `vardiya-takip`) ve devam edin. (Google Analytics isteğe bağlıdır, kapatabilirsiniz).
4. Projeniz saniyeler içinde hazır hale gelecektir.

---

### Adım 2: Giriş Yöntemlerini (Google & E-posta) Aktifleştirme
1. Sol menüden **Build (Oluştur) -> Authentication** seçeneğine tıklayın.
2. **"Get Started" (Başlayın)** butonuna basın.
3. **Sign-in method** sekmesinde:
   * **Google:** Listeden Google'ı seçin, "Enable" (Etkinleştir) anahtarını açın, projenin destek e-postasını seçip **Kaydet**'e basın.
   * **Email/Password:** Listeden Email/Password seçeneğini açın, "Email/Password" anahtarını açıp **Kaydet**'e basın (Email link seçeneğini açmanıza gerek yoktur).

---

### Adım 3: Firestore Veritabanını Açma & Güvenlik Kuralları
1. Sol menüden **Build (Oluştur) -> Firestore Database** seçeneğine tıklayın.
2. **"Create database" (Veritabanı oluştur)** butonuna basın.
3. Konum olarak size en yakın bölgeyi seçin (Örn: `eur3 - europe-west` veya varsayılan `nam5`).
4. Güvenlik kuralları aşamasında **"Start in test mode"** seçebilir veya oluşturduktan sonra **Rules (Kurallar)** sekmesine şu güvenli kuralı yapıştırabilirsiniz:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Her kullanıcı yalnızca kendi verisini okuyabilir ve yazabilir
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
*(Bu kural sayesinde hiçbir kullanıcı bir diğerinin vardiya veya izin verilerine erişemez).*

---

### Adım 4: Web Uygulaması Ekleyip Anahtarları Alma
1. Sol üstteki dişli simgesine ⚙️ tıklayarak **Project settings (Proje ayarları)** sayfasına gidin.
2. Sayfayı aşağı kaydırın ve "Your apps" (Uygulamalarınız) altındaki **`</>` (Web)** simgesine tıklayın.
3. Uygulama takma adı girin (Örn: `vardiya-web`) ve **Register app** butonuna basın.
4. Ekrana gelen `firebaseConfig` objesi içerisindeki değerleri kopyalayın.

---

### Adım 5: `.env` Dosyasına Yapıştırma
Projenin ana dizinindeki `.env` dosyasını açıp ilgili alanlara yapıştırın:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=vardiya-takip.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vardiya-takip
VITE_FIREBASE_STORAGE_BUCKET=vardiya-takip.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789...
VITE_FIREBASE_APP_ID=1:123456789...:web:...
```

Projeyi `npm run dev` ile çalıştırdığınız anda:
* Ayarlar sayfasında **"Google ile Devam Et"** veya **"E-posta ile Kayıt Ol"** butonları canlı Firebase projenize bağlanır.
* Kullanıcı giriş yaptığı an tüm vardiyaları buluta eşitlenir.
* Tarayıcı geçmişi silinse dahi, aynı hesapla girildiğinde tüm veriler saniyeler içinde geri gelir!
