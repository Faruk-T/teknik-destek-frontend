import React, { useState } from "react";
import { Box, Typography, TextField, Button, Alert, Paper, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

function Register({ onRegisterSuccess, onBack }) {
  const [form, setForm] = useState({
    kullaniciAdi: "",
    sifre: "",
    adSoyad: "",
    sirketAdi: "",
    email: "",
    telefon: "",
    rol: "musteri"  // Rol burada varsayılan müşteri olarak set edilmiş
  });
  const [mesaj, setMesaj] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMesaj("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/Kullanici`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rol: "musteri"  // Backend'e kesin müşteri rolü gönderiliyor
        })
      });

      if (response.ok) {
        setMesaj("Kayıt başarılı! Artık giriş yapabilirsiniz.");
        setTimeout(() => onRegisterSuccess(), 1500);
      } else {
        const data = await response.json();
        if (data.message) {
          setMesaj(data.message);
        } else if (data.errors) {
          setMesaj(Object.values(data.errors).flat().join(" | "));
        } else {
          setMesaj("Kayıt başarısız!");
        }
      }
    } catch {
      setMesaj("Sunucuya ulaşılamıyor!");
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Kayıt Ol
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField fullWidth label="Kullanıcı Adı" name="kullaniciAdi" value={form.kullaniciAdi} onChange={handleChange} margin="normal" required />
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
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
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

        <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }} type="submit">
          Kayıt Ol
        </Button>

        {mesaj && (
          <Alert severity={mesaj.includes("başarılı") ? "success" : "error"} sx={{ mt: 2 }}>
            {mesaj}
          </Alert>
        )}
      </Box>

      <Button onClick={onBack} sx={{ mt: 2 }} fullWidth>
        Girişe Dön
      </Button>
    </Paper>
  );
}

export default Register;
