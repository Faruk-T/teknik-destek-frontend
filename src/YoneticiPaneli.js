import React, { useEffect, useState, useCallback } from "react";
import {
  Typography, Box, List, ListItem, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Alert, Chip,
  Paper, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { API_BASE_URL } from './config';

const durumRenk = (durum) => {
  if (durum === "Çözüldü") return "success";
  if (durum === "İşleniyor") return "info";
  return "warning";
};

const SikayetListItem = React.memo(({ sikayet, onAtama, onDurumGuncelle, kullanici }) => {
  const handleAtama = () => onAtama(sikayet.id, sikayet.yoneticiId || "");
  const handleDurumGuncelle = () => onDurumGuncelle(sikayet.id, sikayet.durum);

  return (
    <ListItem alignItems="flex-start" sx={{ border: "none", mb: 3, p: 0, background: "none" }}>
      <Paper sx={{ p: 2, width: "100%", boxShadow: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", flex: 1 }}>
            #{sikayet.id} - {sikayet.konu}
          </Typography>
          <Chip label={sikayet.durum} color={durumRenk(sikayet.durum)} size="small" />
        </Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Müşteri:</strong> {sikayet.kullanici?.adSoyad || "Bilinmiyor"}
        </Typography>
        <Box sx={{ background: "#f5f5f5", borderRadius: 2, p: 2, my: 1 }}>
          <Typography variant="body2" sx={{ fontStyle: "italic" }}>"{sikayet.aciklama}"</Typography>
        </Box>
        {sikayet.alpemixIsteniyor && <Alert severity="warning" sx={{ py: 0, mb: 1 }}>Uzaktan Bağlantı İsteniyor!</Alert>}
        {sikayet.cozumAciklamasi && (
          <Box sx={{ background: "#e8f5e9", borderRadius: 2, p: 2, my: 1, borderLeft: "4px solid #4caf50" }}>
             <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: "bold" }}>ÇÖZÜM:</Typography>
             <Typography variant="body2">{sikayet.cozumAciklamasi}</Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
          <Button variant="outlined" size="small" onClick={handleAtama}>Yönetici Ata</Button>
          <Button variant="contained" size="small" onClick={handleDurumGuncelle}>Durum Güncelle</Button>
        </Box>
      </Paper>
    </ListItem>
  );
});

function YoneticiPaneli({ token, kullanici }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [atamaDialog, setAtamaDialog] = useState({ open: false, sikayetId: null });
  const [durumDialog, setDurumDialog] = useState({ open: false, sikayetId: null });
  const [yoneticiId, setYoneticiId] = useState("");
  const [durum, setDurum] = useState("");
  const [cozumAciklamasi, setCozumAciklamasi] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [kullanicilar, setKullanicilar] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState("atanmamis");

  // useCallback ile fonksiyonları sabitledik
  const fetchSikayetler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/tum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSikayetler(data);
      }
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchYoneticiler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Kullanici`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setKullanicilar(data.filter(k => k.rol === "yonetici"));
      }
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => {
    fetchSikayetler();
    fetchYoneticiler();
    
    if (window.signalRConnection) {
        window.signalRConnection.on("YeniSikayetEklendi", () => {
            setMesaj("🔔 Yeni bir şikayet eklendi!");
            fetchSikayetler();
            setTimeout(() => setMesaj(""), 4000);
        });
    }
  }, [fetchSikayetler, fetchYoneticiler]); // Bağımlılıklar eklendi

  const atanmamislar = sikayetler.filter(s => !s.yoneticiId);
  const banaAtananlar = sikayetler.filter(s => String(s.yoneticiId) === String(kullanici.kullaniciId) && s.durum !== "Çözüldü");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  const handleAtama = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/${atamaDialog.sikayetId}/ata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ yoneticiId: Number(yoneticiId) })
      });
      if (response.ok) {
        setMesaj("✅ Atama başarılı!");
        setAtamaDialog({ open: false, sikayetId: null });
        fetchSikayetler();
      } else { setMesaj("❌ Atama yapılamadı."); }
    } catch { setMesaj("Sunucu hatası!"); }
    setTimeout(() => setMesaj(""), 3000);
  };

  const handleDurumGuncelle = async () => {
    try {
      const bodyData = { durum: durum, cozumAciklamasi: durum === "Çözüldü" ? cozumAciklamasi : null };
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/${durumDialog.sikayetId}/durum`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(bodyData)
      });
      if (response.ok) {
        setMesaj("✅ Durum güncellendi!");
        setDurumDialog({ open: false, sikayetId: null });
        setCozumAciklamasi("");
        fetchSikayetler();
      } else { setMesaj("❌ Güncelleme başarısız."); }
    } catch { setMesaj("Sunucu hatası!"); }
    setTimeout(() => setMesaj(""), 3000);
  };

  return (
    <Box sx={{ mt: 3 }}>
      {mesaj && <Alert severity={mesaj.includes("✅") ? "success" : "info"} sx={{ mb: 2 }}>{mesaj}</Alert>}
      
      <Accordion expanded={expandedPanel === "atanmamis"} onChange={() => setExpandedPanel(expandedPanel === "atanmamis" ? false : "atanmamis")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
           <Typography variant="h6" color="error">⚠️ Atanmamış Şikayetler ({atanmamislar.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <List>
                {atanmamislar.map(s => (
                    <SikayetListItem key={s.id} sikayet={s} 
                        onAtama={(id, yId) => { setAtamaDialog({open:true, sikayetId:id}); setYoneticiId(yId); }} 
                        onDurumGuncelle={(id, d) => { setDurumDialog({open:true, sikayetId:id}); setDurum(d); }} 
                        kullanici={kullanici} 
                    />
                ))}
            </List>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expandedPanel === "bana"} onChange={() => setExpandedPanel(expandedPanel === "bana" ? false : "bana")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
           <Typography variant="h6" color="primary">👤 Bana Atananlar ({banaAtananlar.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <List>
                {banaAtananlar.map(s => (
                    <SikayetListItem key={s.id} sikayet={s} 
                        onAtama={(id, yId) => { setAtamaDialog({open:true, sikayetId:id}); setYoneticiId(yId); }} 
                        onDurumGuncelle={(id, d) => { setDurumDialog({open:true, sikayetId:id}); setDurum(d); }} 
                        kullanici={kullanici} 
                    />
                ))}
            </List>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expandedPanel === "cozulen"} onChange={() => setExpandedPanel(expandedPanel === "cozulen" ? false : "cozulen")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
           <Typography variant="h6" color="success">✅ Çözülenler ({cozulenler.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <List>
                {cozulenler.map(s => (
                    <SikayetListItem key={s.id} sikayet={s} 
                        onAtama={() => {}} 
                        onDurumGuncelle={(id, d) => { setDurumDialog({open:true, sikayetId:id}); setDurum(d); }} 
                        kullanici={kullanici} 
                    />
                ))}
            </List>
        </AccordionDetails>
      </Accordion>

      <Dialog open={atamaDialog.open} onClose={() => setAtamaDialog({ open: false, sikayetId: null })}>
        <DialogTitle>Yönetici Ata</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <TextField select label="Yönetici Seç" value={yoneticiId} onChange={e => setYoneticiId(e.target.value)} fullWidth sx={{ mt: 2 }}>
            {kullanicilar.map(k => <MenuItem key={k.id} value={k.id}>{k.adSoyad}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAtamaDialog({ open: false, sikayetId: null })}>İptal</Button>
          <Button onClick={handleAtama} variant="contained">Ata</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={durumDialog.open} onClose={() => setDurumDialog({ open: false, sikayetId: null })}>
        <DialogTitle>Durum Güncelle</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <TextField select label="Durum" value={durum} onChange={e => setDurum(e.target.value)} fullWidth sx={{ mt: 2 }}>
            <MenuItem value="Bekliyor">Bekliyor</MenuItem>
            <MenuItem value="İşleniyor">İşleniyor</MenuItem>
            <MenuItem value="Çözüldü">Çözüldü</MenuItem>
          </TextField>
          {durum === "Çözüldü" && (
            <TextField label="Çözüm Açıklaması" value={cozumAciklamasi} onChange={e => setCozumAciklamasi(e.target.value)} fullWidth multiline rows={3} sx={{ mt: 2 }} required />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDurumDialog({ open: false, sikayetId: null })}>İptal</Button>
          <Button onClick={handleDurumGuncelle} variant="contained">Güncelle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default YoneticiPaneli;