import React, { useState } from "react";
import { 
  Box, Typography, TextField, Button, Alert, Paper, 
  InputAdornment, IconButton, Fade, Avatar
} from "@mui/material";
import { 
  Visibility, VisibilityOff, PersonAdd, Business, Email, Phone, 
  Badge as BadgeIcon 
} from "@mui/icons-material";

// API Adresi
import { API_BASE_URL as ConfigURL } from './config';
const API_BASE_URL = ConfigURL || "https://localhost:7196";

function Register({ onRegisterSuccess, onBack }) {
  const [form, setForm] = useState({
    kullaniciAdi: "", sifre: "", adSoyad: "", sirketAdi: "", email: "", telefon: "", rol: "musteri"
  });
  const [mesaj, setMesaj] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMesaj("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/Kullanici`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (response.ok) {
        setIsSuccess(true);
        setMesaj("🎉 Kayıt başarılı! Giriş ekranına yönlendiriliyorsunuz...");
        setTimeout(() => onRegisterSuccess(), 2000);
      } else {
        const data = await response.json();
        setMesaj(`❌ ${data.message || "Kayıt başarısız."}`);
      }
    } catch { setMesaj("🔌 Sunucu hatası! Backend çalışıyor mu?"); }
  };

  return (
    <Fade in={true} timeout={800}>
      <Box 
        sx={{ 
          width: "100%", // Tüm genişliği kapla
          height: "100vh", // Tüm yüksekliği kapla
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          bgcolor: "#f5f5f5", 
          backgroundImage: "radial-gradient(#e0e0e0 1px, transparent 1px)", 
          backgroundSize: "20px 20px",
          position: "fixed", // Sayfaya sabitle (Kaymayı önler)
          top: 0,
          left: 0
        }}
      >
          <Paper elevation={24} sx={{ 
              p: 5, // İç boşluğu artırdık (daha ferah)
              width: "100%", 
              maxWidth: "500px", // 🔥 Genişliği Artırdık (Eskiden 444px idi)
              borderRadius: "24px", 
              background: "rgba(255, 255, 255, 0.95)", 
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
          }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
                <Avatar sx={{ m: "auto", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", width: 70, height: 70, mb: 2, boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)" }}>
                    <PersonAdd fontSize="large" />
                </Avatar>
                <Typography variant="h4" fontWeight="900" sx={{ background: "linear-gradient(135deg, #333 0%, #666 100%)", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Aramıza Katılın
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                  Hızlı destek için hesabınızı oluşturun
                </Typography>
            </Box>
            
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                
                <TextField 
                    fullWidth label="Ad Soyad" name="adSoyad" variant="outlined"
                    value={form.adSoyad} onChange={handleChange} required 
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment>, 
                      sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                />
                
                <TextField 
                    fullWidth label="Kullanıcı Adı" name="kullaniciAdi" variant="outlined"
                    value={form.kullaniciAdi} onChange={handleChange} required 
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><PersonAdd color="action" /></InputAdornment>, 
                      sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                />
                
                <TextField
                    fullWidth label="Şifre" name="sifre" type={showPassword ? "text" : "password"} variant="outlined"
                    value={form.sifre} onChange={handleChange} required
                    InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                        </InputAdornment>
                    ),
                    sx: { borderRadius: 3, bgcolor: "#f9fafb" }
                    }}
                />
                
                <TextField 
                    fullWidth label="Şirket Adı" name="sirketAdi" variant="outlined"
                    value={form.sirketAdi} onChange={handleChange} required 
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><Business color="action" /></InputAdornment>, 
                      sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                />
                
                <TextField 
                    fullWidth label="E-posta" name="email" type="email" variant="outlined"
                    value={form.email} onChange={handleChange} required 
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment>, 
                      sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                />
                
                <TextField 
                    fullWidth label="Telefon" name="telefon" variant="outlined"
                    value={form.telefon} onChange={handleChange} required 
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment>, 
                      sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                />

                <Button 
                    variant="contained" fullWidth 
                    sx={{ 
                        mt: 2, py: 1.8, borderRadius: "16px", fontWeight: "800", fontSize: "1.1rem",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
                        textTransform: "none",
                        transition: "all 0.3s",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 25px rgba(102, 126, 234, 0.5)" }
                    }} 
                    type="submit"
                >
                    Kayıt Ol
                </Button>
              </Box>

              {mesaj && (
                <Fade in={true}>
                  <Alert severity={isSuccess ? "success" : "error"} sx={{ mt: 3, borderRadius: 3, fontWeight: "600" }}>
                    {mesaj}
                  </Alert>
                </Fade>
              )}
            </form>

            <Button onClick={onBack} fullWidth sx={{ mt: 3, textTransform: 'none', color: '#666', fontWeight: "500" }}>
              Zaten hesabınız var mı? <span style={{ color: "#667eea", fontWeight: "800", marginLeft: "5px" }}>Giriş Yap</span>
            </Button>
          </Paper>
      </Box>
    </Fade>
  );
}

export default Register;