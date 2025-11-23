import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  List,
  ListItem,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  Paper,
  Chip,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as signalR from "@microsoft/signalr";

function durumRenk(durum) {
  if (durum === "Çözüldü") return "success";
  if (durum === "İşleniyor") return "info";
  return "warning";
}

const API_URL = process.env.REACT_APP_API_URL || "http://192.168.1.14:5106";

function MusteriPaneli({ token, kullaniciId, kullanici }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [sikayetForm, setSikayetForm] = useState({
    konu: "",
    aciklama: "",
    alpemixIsteniyor: false,
    alpemixKodu: ""
  });
  const [sikayetMesaj, setSikayetMesaj] = useState("");
  const [connection, setConnection] = useState(null);

  const fetchSikayetler = async () => {
    try {
      const response = await fetch(`${API_URL}/api/Sikayet/kullanici/${kullaniciId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSikayetler(data);
      } else {
        setSikayetler([]);
      }
    } catch {
      setSikayetler([]);
    }
  };

  // SignalR bağlantısını kur
  useEffect(() => {
    if (token) {
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/chatHub?userId=${kullaniciId}`, {
          accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

      setConnection(newConnection);

      return () => {
        if (newConnection) {
          newConnection.stop();
        }
      };
    }
  }, [token, kullaniciId]);

  // SignalR eventlerini dinle
  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log("Müşteri SignalR bağlantısı kuruldu");
          
          // Şikayet durumu güncellendiğinde dinle
          connection.on("SikayetDurumGuncellendi", (sikayetId, yeniDurum, cozumAciklamasi) => {
            console.log("Şikayet durumu güncellendi:", sikayetId, yeniDurum);
            
            // Şikayet listesini güncelle
            setSikayetler(prev => 
              prev.map(s => 
                s.id === sikayetId 
                  ? { ...s, durum: yeniDurum, cozumAciklamasi: cozumAciklamasi || s.cozumAciklamasi }
                  : s
              )
            );
          });

          // Şikayet atandığında dinle ve durumu güncelle
          connection.on("SikayetAtandi", (sikayetId, konu, atananKullaniciId, atayanKullaniciAdi) => {
            console.log("Şikayet atandı:", sikayetId, konu, atananKullaniciId);
            
            // Eğer bu şikayet bana aitse durumu "İşleniyor" olarak güncelle
            setSikayetler(prev => 
              prev.map(s => 
                s.id === sikayetId 
                  ? { ...s, durum: "İşleniyor", yonetici: { adSoyad: atayanKullaniciAdi } }
                  : s
              )
            );
          });
        })
        .catch(err => {
          console.error("Müşteri SignalR bağlantısı hatası:", err);
        });
    }
  }, [connection]);

  useEffect(() => {
    if (token && kullaniciId) fetchSikayetler();
    // eslint-disable-next-line
  }, [token, kullaniciId]);

  const handleSikayetChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSikayetForm(prev => {
      if (name === "alpemixIsteniyor" && !checked) {
        return { ...prev, alpemixIsteniyor: false, alpemixKodu: "" };
      }
      return { ...prev, [name]: type === "checkbox" ? checked : value };
    });
  };

  const handleSikayetSubmit = async (e) => {
    e.preventDefault();
    setSikayetMesaj("");
    try {
      const response = await fetch(`${API_URL}/api/Sikayet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          kullaniciId: kullaniciId,
          konu: sikayetForm.konu,
          aciklama: sikayetForm.aciklama,
          alpemixIsteniyor: sikayetForm.alpemixIsteniyor,
          alpemixKodu: sikayetForm.alpemixKodu
        })
      });
      if (response.ok) {
        setSikayetMesaj("Şikayet başarıyla eklendi!");
        setSikayetForm({ konu: "", aciklama: "", alpemixIsteniyor: false, alpemixKodu: "" });
        fetchSikayetler();
      } else {
        let msg = "Şikayet eklenemedi!";
        try {
          const data = await response.json();
          if (data && data.errors) {
            msg += " " + Object.values(data.errors).flat().join(" | ");
          }
        } catch {}
        setSikayetMesaj(msg);
      }
    } catch {
      setSikayetMesaj("Sunucuya ulaşılamıyor!");
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar>{kullanici.adSoyad[0]}</Avatar>
          <Typography variant="h6">
            Hoşgeldin, <b>{kullanici.adSoyad}</b>
          </Typography>
        </Box>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Şikayet Ekle
      </Typography>
      <Paper sx={{ p: 2, mb: 4 }}>
        <Box component="form" onSubmit={handleSikayetSubmit}>

          {/* Konu alanı: sadece Yazılımsal / Donanımsal seçenekleri */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="konu-label">Konu</InputLabel>
            <Select
              labelId="konu-label"
              name="konu"
              value={sikayetForm.konu}
              onChange={handleSikayetChange}
            >
              <MenuItem value="Yazılımsal">Yazılımsal</MenuItem>
              <MenuItem value="Donanımsal">Donanımsal</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Açıklama"
            name="aciklama"
            value={sikayetForm.aciklama}
            onChange={handleSikayetChange}
            margin="normal"
            required
            multiline
            rows={3}
          />

          <FormControlLabel
            control={
              <Checkbox
                name="alpemixIsteniyor"
                checked={sikayetForm.alpemixIsteniyor}
                onChange={handleSikayetChange}
              />
            }
            label="Alpemix Desteği İstiyorum"
          />

          {sikayetForm.alpemixIsteniyor ? (
            <TextField
              fullWidth
              label="Alpemix Bağlantı Kodu"
              name="alpemixKodu"
              value={sikayetForm.alpemixKodu}
              onChange={handleSikayetChange}
              margin="normal"
              required
            />
          ) : null}

          <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} type="submit">
            Şikayet Ekle
          </Button>

          {sikayetMesaj && (
            <Alert severity={sikayetMesaj.includes("başarıyla") ? "success" : "error"} sx={{ mt: 2 }}>
              {sikayetMesaj}
            </Alert>
          )}
        </Box>
      </Paper>

      <Accordion sx={{ mt: 4, borderRadius: 2, boxShadow: 2, background: '#f8fbfc' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Şikayetlerim</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {sikayetler.map((s) => (
              <ListItem
                key={s.id}
                alignItems="flex-start"
                sx={{ border: "none", mb: 3, p: 0, background: "none" }}
              >
                <Paper sx={{ p: 3, width: "100%", boxShadow: 3, borderRadius: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", flex: 1 }}>
                      {s.konu}
                    </Typography>
                    <Chip label={s.durum} color={durumRenk(s.durum)} size="medium" sx={{ fontWeight: "bold", fontSize: 16 }} />
                  </Box>
                                     <Box sx={{ background: "#f5f5f5", borderRadius: 2, p: 2, my: 2, borderLeft: "4px solid #1976d2" }}>
                     <Typography variant="overline" sx={{ color: '#888', letterSpacing: 1, fontWeight: 600, mb: 0.5 }}>
                       Sorun
                     </Typography>
                     <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                       {s.aciklama}
                     </Typography>
                   </Box>
                   
                   {/* Çözüm açıklaması varsa göster */}
                   {s.cozumAciklamasi && (
                     <Box sx={{ background: "#e8f5e8", borderRadius: 2, p: 2, my: 2, borderLeft: "4px solid #4caf50" }}>
                       <Typography variant="overline" sx={{ color: '#2e7d32', letterSpacing: 1, fontWeight: 600, mb: 0.5 }}>
                         Çözüm
                       </Typography>
                       <Typography variant="body1" sx={{ fontStyle: "italic", color: "#1b5e20" }}>
                         {s.cozumAciklamasi}
                       </Typography>
                     </Box>
                   )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
                    <Typography variant="body1" sx={{ color: "#333", fontWeight: 500, display: "flex", alignItems: "center", gap: 1 }}>
                      <span role="img" aria-label="tarih">🕒</span> {new Date(s.tarih).toLocaleString()}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#333", fontWeight: 500, display: "flex", alignItems: "center", gap: 1 }}>
                      <span role="img" aria-label="yönetici">👤</span> {s.yonetici?.adSoyad || "Atanmamış"}
                    </Typography>
                  </Box>
                </Paper>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default MusteriPaneli;
