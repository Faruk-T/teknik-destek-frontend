import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  Paper, 
  InputAdornment, 
  IconButton,
  Container
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// Backend Adresini Buraya Sabitliyoruz (Garanti Çözüm)
// Eski: const API_BASE_URL = "http://localhost:5106";
// YENİSİ (Bunu Yapıştır):
import { API_BASE_URL } from './config';

function Register({ onRegisterSuccess, onBack }) {
  const [form, setForm] = useState({
    kullaniciAdi: "",
    sifre: "",
    adSoyad: "",
    sirketAdi: "",
    email: "",
    telefon: "",
    rol: "musteri"
  });
  
  const [mesaj, setMesaj] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMesaj("");
    setIsSuccess(false);

    try {
      console.log("Kayıt isteği gönderiliyor...", `${API_BASE_URL}/api/Kullanici`);
      
      const response = await fetch(`${API_BASE_URL}/api/Kullanici`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setIsSuccess(true);
        setMesaj("✅ Kayıt başarılı! Giriş ekranına yönlendiriliyorsunuz...");
        // 1.5 saniye sonra giriş ekranına dön
        setTimeout(() => onRegisterSuccess(), 1500);
      } else {
        const data = await response.json();
        // Backend'den gelen hata mesajını göster
        if (data.message) {
          setMesaj(`❌ ${data.message}`);
        } else if (data.errors) {
          // Validasyon hatalarını birleştir
          const errorMessages = Object.values(data.errors).flat().join(" | ");
          setMesaj(`⚠️ ${errorMessages}`);
        } else {
          setMesaj("❌ Kayıt başarısız! Bilgileri kontrol edin.");
        }
      }
    } catch (err) {
      console.error("Kayıt Hatası:", err);
      setMesaj("🔌 Sunucuya ulaşılamıyor! Backend'in çalıştığından emin olun (https://localhost:7196).");
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 2, borderRadius: 2 }}>
        <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
          📝 Kayıt Ol
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField 
            fullWidth label="Kullanıcı Adı" name="kullaniciAdi" 
            value={form.kullaniciAdi} onChange={handleChange} margin="normal" required 
          />
          
          <TextField
            fullWidth
            label="Şifre"
            name="sifre"
            type={showPassword ? "text" : "password"}
            value={form.sifre}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField fullWidth label="Ad Soyad" name="adSoyad" value={form.adSoyad} onChange={handleChange} margin="normal" required />
          <TextField fullWidth label="Şirket Adı" name="sirketAdi" value={form.sirketAdi} onChange={handleChange} margin="normal" required />
          <TextField fullWidth label="E-posta" name="email" type="email" value={form.email} onChange={handleChange} margin="normal" required />
          <TextField fullWidth label="Telefon" name="telefon" value={form.telefon} onChange={handleChange} margin="normal" required />

          <Button 
            variant="contained" 
            fullWidth 
            sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem', fontWeight: 'bold' }} 
            type="submit"
          >
            Kayıt Ol
          </Button>

          {mesaj && (
            <Alert severity={isSuccess ? "success" : "error"} sx={{ mt: 2 }}>
              {mesaj}
            </Alert>
          )}
        </Box>

        <Button onClick={onBack} fullWidth sx={{ mt: 1, textTransform: 'none' }}>
          ⬅ Girişe Dön
        </Button>
      </Paper>
    </Container>
  );
}

export default Register;