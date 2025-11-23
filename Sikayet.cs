using System;
using System.ComponentModel.DataAnnotations;

namespace DestekAPI.Models
{
    // Şikayet sınıfı, kullanıcıların açtığı destek taleplerini temsil eder.
    public class Sikayet
    {
        // Şikayetin benzersiz ID'si (Primary Key)
        public int Id { get; set; }

        // Şikayeti açan kullanıcının ID'si (zorunlu)
        [Required]
        public int KullaniciId { get; set; }

        // Şikayeti alan yönetici ID'si (opsiyonel, nullable)
        public int? YoneticiId { get; set; }

        // Şikayetin konusu (zorunlu, maksimum 100 karakter)
        [Required(ErrorMessage = "Konu zorunludur.")]
        [StringLength(100, ErrorMessage = "Konu en fazla 100 karakter olabilir.")]
        public string Konu { get; set; }

        // Şikayetin detaylı açıklaması (zorunlu, maksimum 1000 karakter)
        [Required(ErrorMessage = "Açıklama zorunludur.")]
        [StringLength(1000, ErrorMessage = "Açıklama en fazla 1000 karakter olabilir.")]
        public string Aciklama { get; set; }

        // Şikayetin açıldığı tarih, default olarak şu an atanır
        public DateTime Tarih { get; set; } = DateTime.Now;

        // Yöneticinin atandığı tarih (opsiyonel)
        public DateTime? AtamaTarihi { get; set; }

        // Şikayetin çözüldüğü tarih (opsiyonel)
        public DateTime? CozulmeTarihi { get; set; }

        // Şikayetin durumu: Bekliyor, İşleniyor, Çözüldü
        // İleride enum ile değiştirebiliriz
        public string Durum { get; set; } = "Bekliyor";

        // Şikayetin önceliği: Düşük, Orta, Yüksek
        // İleride enum ile değiştirebiliriz
        public string Oncelik { get; set; } = "Orta";

        // Alpemix bağlantısı istenip istenmediği (default false)
        public bool AlpemixIsteniyor { get; set; } = false;

        // Alpemix bağlantı kodu (opsiyonel)
        public string AlpemixKodu { get; set; }

        // Çözüm açıklaması (opsiyonel, maksimum 2000 karakter)
        [StringLength(2000, ErrorMessage = "Çözüm açıklaması en fazla 2000 karakter olabilir.")]
        public string? CozumAciklamasi { get; set; }

        // Navigation properties (Entity Framework ilişkileri)

        // Şikayeti açan kullanıcı
        public Kullanici Kullanici { get; set; }

        // Şikayeti alan yönetici
        public Kullanici Yonetici { get; set; }
    }
}


