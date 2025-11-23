# 📊 Günlük İş Takibi Sistemi

Bu sistem, yöneticilerin günlük olarak çözdükleri şikayetleri takip etmelerini sağlar.

## 🚀 Özellikler

### API Endpoint'leri

#### 1. Günlük Çözülen Şikayetler
- **GET** `/api/Sikayet/gunluk-cozulenler`
- Bugün çözülen tüm şikayetleri listeler
- Müşteri bilgileri, yönetici bilgileri ve çözüm detayları dahil

#### 2. Belirli Yöneticinin Günlük Çözülen Şikayetleri
- **GET** `/api/Sikayet/gunluk-cozulenler/{yoneticiId}`
- Belirli bir yöneticinin bugün çözdüğü şikayetleri listeler

#### 3. Günlük İş Özeti
- **GET** `/api/Sikayet/gunluk-ozet`
- Tüm yöneticiler için günlük performans özeti
- Yönetici bazında çözülen şikayet sayıları
- Öncelik bazında puanlama

### Frontend Bileşenleri

#### Günlük İş Takibi Paneli
- 📈 Günlük özet kartı
- 👥 Yönetici bazlı detay kartları
- 📋 Çözülen şikayetlerin detaylı listesi
- 🔄 Otomatik veri yenileme

#### Özellikler
- **Gerçek Zamanlı Güncelleme**: Panel açıldığında veriler otomatik yenilenir
- **Görsel Gösterim**: Renkli kartlar ve chip'ler ile kolay okunabilirlik
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Performans Metrikleri**: Öncelik bazında puanlama sistemi

## 🛠️ Teknik Detaylar

### Veritabanı Sorguları
- Günlük filtreleme: `DateTime.Today` ile bugünün başlangıcı ve yarının başlangıcı arası
- Include ile ilişkili veriler (Kullanıcı, Yönetici)
- GroupBy ile yönetici bazında gruplama
- OrderBy ile performans sıralaması

### Güvenlik
- Sadece `yonetici` rolündeki kullanıcılar erişebilir
- JWT token tabanlı kimlik doğrulama
- Role-based authorization

### SignalR Entegrasyonu
- Gerçek zamanlı bildirimler
- Şikayet durumu güncellemelerinde otomatik bildirim
- Yeni şikayet eklendiğinde yöneticilere bildirim

## 📱 Kullanım

### Yönetici Paneli
1. **Giriş Yap**: Yönetici hesabı ile giriş yapın
2. **Günlük Takip**: "📊 Günlük İş Takibi" accordion'unu açın
3. **Veri Yenileme**: 🔄 butonuna tıklayarak verileri manuel yenileyin
4. **Detay Görüntüleme**: Her yönetici kartına tıklayarak detayları görün

### Veri Görüntüleme
- **Günlük Özet**: Toplam çözülen şikayet sayısı ve aktif yönetici sayısı
- **Yönetici Kartları**: Her yönetici için çözülen şikayet sayısı ve son çözüm saati
- **Şikayet Detayları**: Çözülen şikayetlerin konu, müşteri, yönetici ve çözüm bilgileri

## 🔧 Kurulum

### Backend (API)
1. Projeyi derleyin: `dotnet build`
2. Veritabanı migration'larını çalıştırın: `dotnet ef database update`
3. API'yi başlatın: `dotnet run`

### Frontend
1. Bağımlılıkları yükleyin: `npm install`
2. Uygulamayı başlatın: `npm start`

## 📊 Veri Yapısı

### Günlük Özet Response
```json
{
  "Tarih": "15.01.2025",
  "ToplamCozulenSikayet": 25,
  "ToplamYonetici": 8,
  "YoneticiDetaylari": [
    {
      "YoneticiId": 1,
      "YoneticiAdi": "Ahmet Yılmaz",
      "CozulenSikayetSayisi": 5,
      "ToplamOncelik": 12,
      "SonCozulenSaat": "16:30",
      "Sikayetler": [...]
    }
  ]
}
```

### Günlük Çözülen Şikayet Response
```json
[
  {
    "Id": 123,
    "Konu": "Sistem Hatası",
    "Aciklama": "Uygulama açılmıyor",
    "CozulmeTarihi": "2025-01-15T16:30:00",
    "CozumAciklamasi": "Cache temizlendi",
    "Oncelik": "Yüksek",
    "MusteriAdi": "Mehmet Demir",
    "MusteriSirketi": "ABC Şirketi",
    "YoneticiAdi": "Ahmet Yılmaz",
    "YoneticiId": 1,
    "CozulmeSaat": "16:30",
    "CozulmeGunu": "15.01.2025"
  }
]
```

## 🎯 Gelecek Geliştirmeler

- [ ] Haftalık ve aylık raporlar
- [ ] Excel/PDF export özelliği
- [ ] E-posta bildirimleri
- [ ] Dashboard grafikleri
- [ ] Performans karşılaştırmaları
- [ ] Otomatik rapor gönderimi

## 📞 Destek

Herhangi bir sorun veya öneri için geliştirici ekibi ile iletişime geçin.
