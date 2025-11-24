import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Typography, TextField, Button, Paper, Chip, Alert, 
  FormControlLabel, Switch, CircularProgress, List, ListItem,
  Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as signalR from "@microsoft/signalr";

import { API_BASE_URL } from './config';

const statusStyles = {
  "Çözüldü": { color: "#2e7d32", bg: "#e8f5e9" },
  "İşleniyor": { color: "#1565c0", bg: "#e3f2fd" },
  "Bekliyor": { color: "#e65100", bg: "#fff3e0" }
};

const SikayetListItem = ({ s }) => {
    const style = statusStyles[s.durum] || statusStyles["Bekliyor"];
    return (
        <ListItem alignItems="flex-start" sx={{ p: 0, mb: 2 }}>
            <Paper sx={{ p: 2.5, width: "100%", borderRadius: "16px", border: "1px solid #f0f0f0" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Chip label={s.durum} sx={{ bgcolor: style.bg, color: style.color, fontWeight: "bold", borderRadius: "8px" }} size="small" />
                    <Typography variant="caption" color="textSecondary">{new Date(s.tarih).toLocaleDateString('tr-TR')}</Typography>
                </Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{s.konu}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{s.aciklama}</Typography>
                {s.cozumAciklamasi && (
                    <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit"/>} sx={{ borderRadius: "10px", py: 0 }}>
                        <strong>Çözüm:</strong> {s.cozumAciklamasi}
                    </Alert>
                )}
            </Paper>
        </ListItem>
    );
};

function MusteriPaneli({ token, kullaniciId, kullanici }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [yeniSikayet, setYeniSikayet] = useState({ konu: "", aciklama: "", alpemixIsteniyor: false });
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState("yeniTalep"); 

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const fetchSikayetler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/kullanici/${kullaniciId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSikayetler(data);
      }
    } catch (err) { console.error(err); }
  }, [kullaniciId, token]);

  useEffect(() => {
    fetchSikayetler();
    let connection = window.signalRConnection;
    if (!connection) {
        connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/chathub?userId=${kullaniciId}`, { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .build();
        connection.start().catch(err => console.error(err));
    }
    connection.on("SikayetDurumGuncellendi", (id, yeniDurum) => {
        setSikayetler(prev => prev.map(s => String(s.id) === String(id) ? { ...s, durum: yeniDurum } : s));
        if(yeniDurum === "Çözüldü") setMesaj("🎉 Şikayetiniz çözüldü!");
        setTimeout(() => setMesaj(""), 5000);
    });
    return () => { connection.off("SikayetDurumGuncellendi"); };
  }, [fetchSikayetler, kullaniciId, token]);

  const handleSikayetEkle = async (e) => {
    e.preventDefault();
    setMesaj(""); setYukleniyor(true);
    try {
      const gonderilecekVeri = { ...yeniSikayet, kullaniciId, alpemixKodu: "" };
      const response = await fetch(`${API_BASE_URL}/api/Sikayet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(gonderilecekVeri)
      });
      if (response.ok) {
        setMesaj("✅ Talep oluşturuldu!");
        setYeniSikayet({ konu: "", aciklama: "", alpemixIsteniyor: false });
        fetchSikayetler(); 
        setExpandedPanel("bekleyen"); 
      } else { setMesaj("❌ Hata oluştu."); }
    } catch (err) { setMesaj("Sunucu hatası!"); } 
    finally { setYukleniyor(false); setTimeout(() => setMesaj(""), 4000); }
  };

  const bekleyenler = sikayetler.filter(s => s.durum === "Bekliyor");
  const islemdekiler = sikayetler.filter(s => s.durum === "İşleniyor");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  return (
    // ---------- Ortalanmış Container Başlangıcı ----------
    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
      <Box sx={{ width: "900px", maxWidth: "95%" }}>
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" fontWeight="bold" color="#333">Müşteri Paneli</Typography>
          <Typography color="textSecondary">Hoşgeldin {kullanici?.adSoyad}</Typography>
        </Box>

        {mesaj && <Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>{mesaj}</Alert>}

        <Accordion expanded={expandedPanel === "yeniTalep"} onChange={handleAccordionChange("yeniTalep")} sx={{ borderRadius: "16px !important", mb: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f8faff" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AddCircleOutlineIcon color="primary" />
                  <Typography variant="h6" color="primary" fontWeight="bold">Yeni Destek Talebi</Typography>
              </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
              <form onSubmit={handleSikayetEkle}>
                  <TextField fullWidth label="Konu" variant="outlined" value={yeniSikayet.konu} onChange={(e) => setYeniSikayet({ ...yeniSikayet, konu: e.target.value })} margin="normal" required InputProps={{ sx: { borderRadius: 3 } }} />
                  <TextField fullWidth label="Açıklama" variant="outlined" multiline rows={4} value={yeniSikayet.aciklama} onChange={(e) => setYeniSikayet({ ...yeniSikayet, aciklama: e.target.value })} margin="normal" required InputProps={{ sx: { borderRadius: 3 } }} />
                  <Box sx={{ mt: 2 }}>
                      <FormControlLabel control={<Switch checked={yeniSikayet.alpemixIsteniyor} onChange={(e) => setYeniSikayet({ ...yeniSikayet, alpemixIsteniyor: e.target.checked })} />} label="Uzaktan Bağlantı (Alpemix) Gerekli" />
                  </Box>
                  <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, py: 1.5, fontWeight: "bold", borderRadius: 3 }} disabled={yukleniyor}>
                      {yukleniyor ? <CircularProgress size={24} color="inherit" /> : "Talebi Gönder"}
                  </Button>
              </form>
          </AccordionDetails>
        </Accordion>

        <Typography variant="h6" sx={{ mb: 2, ml: 1, color: "#555", fontWeight: 'bold' }}>Taleplerim</Typography>

        <Accordion expanded={expandedPanel === "bekleyen"} onChange={handleAccordionChange("bekleyen")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "none", border: "1px solid #e0e0e0" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#fff3e0" }}>
              <Typography variant="subtitle1" color="textPrimary" fontWeight="bold">Bekleyen Talepler ({bekleyenler.length})</Typography>
          </AccordionSummary>
          <AccordionDetails><List>{bekleyenler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Bekleyen talep yok.</Typography> : bekleyenler.map(s => <SikayetListItem key={s.id} s={s} />)}</List></AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedPanel === "islemde"} onChange={handleAccordionChange("islemde")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "none", border: "1px solid #e0e0e0" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e3f2fd" }}>
              <Typography variant="subtitle1" color="textPrimary" fontWeight="bold">İşlemdeki Talepler ({islemdekiler.length})</Typography>
          </AccordionSummary>
          <AccordionDetails><List>{islemdekiler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>İşlemde olan talep yok.</Typography> : islemdekiler.map(s => <SikayetListItem key={s.id} s={s} />)}</List></AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedPanel === "cozulen"} onChange={handleAccordionChange("cozulen")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "none", border: "1px solid #e0e0e0" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e8f5e9" }}>
              <Typography variant="subtitle1" color="textPrimary" fontWeight="bold">Çözülen Talepler ({cozulenler.length})</Typography>
          </AccordionSummary>
          <AccordionDetails><List>{cozulenler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Henüz çözülen talep yok.</Typography> : cozulenler.map(s => <SikayetListItem key={s.id} s={s} />)}</List></AccordionDetails>
        </Accordion>
      </Box>
    </Box>
    // ---------- Ortalanmış Container Sonu ----------
  );
}

export default MusteriPaneli;
