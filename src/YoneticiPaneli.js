import React, { useEffect, useState, useCallback } from "react";
import {
  Typography, Box, List, ListItem, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Alert, Chip,
  Paper, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PersonIcon from '@mui/icons-material/Person';

import { API_BASE_URL } from './config';

const statusStyles = {
  "Çözüldü": { color: "#2e7d32", bg: "#e8f5e9" },
  "İşleniyor": { color: "#1565c0", bg: "#e3f2fd" },
  "Bekliyor": { color: "#e65100", bg: "#fff3e0" }
};

const SikayetListItem = React.memo(({ sikayet, onAtama, onDurumGuncelle }) => {
  const style = statusStyles[sikayet.durum] || statusStyles["Bekliyor"];

  return (
    <ListItem alignItems="flex-start" sx={{ p: 0, mb: 2 }}>
      <Paper sx={{ p: 2.5, width: "100%", borderRadius: "16px", border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
             <Chip label={sikayet.durum} sx={{ bgcolor: style.bg, color: style.color, fontWeight: "bold", borderRadius: "8px" }} size="small" />
             <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>#{sikayet.id} - {sikayet.konu}</Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">{new Date(sikayet.tarih).toLocaleDateString('tr-TR')}</Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 1 }}><strong>Müşteri:</strong> {sikayet.kullanici?.adSoyad} ({sikayet.kullanici?.sirketAdi})</Typography>
        <Box sx={{ background: "#f9fafb", borderRadius: "12px", p: 2, my: 1, border: "1px solid #f0f0f0" }}>
          <Typography variant="body2" sx={{ color: "#555" }}>"{sikayet.aciklama}"</Typography>
        </Box>
        {sikayet.alpemixIsteniyor && <Alert severity="warning" icon={false} sx={{ py: 0, mb: 1, borderRadius: "8px" }}>🚨 Uzaktan Bağlantı İsteniyor</Alert>}
        {sikayet.cozumAciklamasi && (
          <Box sx={{ background: "#e8f5e9", borderRadius: "12px", p: 2, my: 1, borderLeft: "4px solid #4caf50" }}>
             <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: "bold" }}>ÇÖZÜM:</Typography>
             <Typography variant="body2">{sikayet.cozumAciklamasi}</Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            {!sikayet.yoneticiId ? (
                <Button variant="outlined" size="small" onClick={() => onAtama(sikayet.id)} startIcon={<AssignmentIndIcon />} sx={{ borderRadius: "8px" }}>Ata</Button>
            ) : (
                <Chip label="Atandı" size="small" variant="outlined" color="primary" icon={<PersonIcon />} sx={{ borderRadius: "8px" }} />
            )}
            <Button variant="contained" size="small" onClick={() => onDurumGuncelle(sikayet.id, sikayet.durum)} disableElevation sx={{ borderRadius: "8px", bgcolor: "#667eea" }}>Güncelle</Button>
        </Box>
      </Paper>
    </ListItem>
  );
});

function YoneticiPaneli({ token, kullanici }) {
  const [sikayetler, setSikayetler] = useState([]);
  
  // 🔥 DÜZELTME: State isimlerini netleştirdik (sikayetId olarak tutacağız)
  const [atamaDialog, setAtamaDialog] = useState({ open: false, sikayetId: null });
  const [durumDialog, setDurumDialog] = useState({ open: false, sikayetId: null });
  
  const [yoneticiId, setYoneticiId] = useState("");
  const [durum, setDurum] = useState("");
  const [cozumAciklamasi, setCozumAciklamasi] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [kullanicilar, setKullanicilar] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState("atanmamis");

  const fetchSikayetler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/tum`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setSikayetler(await response.json());
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchYoneticiler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Kullanici`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setKullanicilar(data.filter(k => k.rol === "yonetici")); // Sadece yöneticileri al
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
  }, [fetchSikayetler, fetchYoneticiler]);

  const atanmamislar = sikayetler.filter(s => !s.yoneticiId);
  const banaAtananlar = sikayetler.filter(s => String(s.yoneticiId) === String(kullanici.kullaniciId) && s.durum !== "Çözüldü");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  const handleChangePanel = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // 🔥 DÜZELTME: Atama işlemi artık doğru ID'yi kullanıyor
  const handleAtama = async () => {
    if (!yoneticiId) {
        setMesaj("❌ Lütfen bir yönetici seçin!");
        return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/${atamaDialog.sikayetId}/ata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ yoneticiId: Number(yoneticiId) })
      });

      if (response.ok) {
        setMesaj("✅ Atama başarılı!");
        setAtamaDialog({ open: false, sikayetId: null });
        setYoneticiId(""); // Seçimi sıfırla
        fetchSikayetler();
      } else {
        setMesaj("❌ Atama yapılamadı.");
      }
    } catch { setMesaj("Hata!"); }
    
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
      }
    } catch { setMesaj("Hata!"); }
    setTimeout(() => setMesaj(""), 3000);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" fontWeight="bold" color="#333">Yönetim Paneli</Typography>
        <Typography color="textSecondary">Hoşgeldin, {kullanici.adSoyad}</Typography>
      </Box>

      {mesaj && <Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>{mesaj}</Alert>}
      
      <Accordion expanded={expandedPanel === "atanmamis"} onChange={handleChangePanel("atanmamis")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #ffebee" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#ffebee" }}>
           <Typography variant="h6" color="error" fontWeight="bold">⚠️ Atanmamış ({atanmamislar.length})</Typography>
        </AccordionSummary>
        <AccordionDetails><List>{atanmamislar.map(s => <SikayetListItem key={s.id} sikayet={s} onAtama={(id) => {setAtamaDialog({open:true, sikayetId:id})}} onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}} />)}</List></AccordionDetails>
      </Accordion>

      <Accordion expanded={expandedPanel === "bana"} onChange={handleChangePanel("bana")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e3f2fd" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e3f2fd" }}>
           <Typography variant="h6" color="primary" fontWeight="bold">👤 Bana Atananlar ({banaAtananlar.length})</Typography>
        </AccordionSummary>
        <AccordionDetails><List>{banaAtananlar.map(s => <SikayetListItem key={s.id} sikayet={s} onAtama={(id) => {setAtamaDialog({open:true, sikayetId:id})}} onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}} />)}</List></AccordionDetails>
      </Accordion>

      <Accordion expanded={expandedPanel === "cozulen"} onChange={handleChangePanel("cozulen")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e8f5e9" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e8f5e9" }}>
           <Typography variant="h6" color="success.main" fontWeight="bold">✅ Çözülenler ({cozulenler.length})</Typography>
        </AccordionSummary>
        <AccordionDetails><List>{cozulenler.map(s => <SikayetListItem key={s.id} sikayet={s} onAtama={() => {}} onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}} />)}</List></AccordionDetails>
      </Accordion>

      {/* --- DÜZELTİLMİŞ ATAMA DİALOG --- */}
      <Dialog open={atamaDialog.open} onClose={() => setAtamaDialog({ open: false, sikayetId: null })} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle>Yönetici Ata</DialogTitle>
        <DialogContent>
          <TextField select label="Yönetici Seç" value={yoneticiId} onChange={e => setYoneticiId(e.target.value)} fullWidth margin="normal" InputProps={{ sx: { borderRadius: 2 } }}>
            {kullanicilar.map(k => <MenuItem key={k.id} value={k.id}>{k.adSoyad}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAtamaDialog({ open: false, sikayetId: null })}>İptal</Button>
            <Button onClick={handleAtama} variant="contained" sx={{ borderRadius: 2 }}>Ata</Button>
        </DialogActions>
      </Dialog>

      {/* Durum Dialog */}
      <Dialog open={durumDialog.open} onClose={() => setDurumDialog({ open: false, sikayetId: null })} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle>Durum Güncelle</DialogTitle>
        <DialogContent>
          <TextField select label="Durum" value={durum} onChange={e => setDurum(e.target.value)} fullWidth margin="normal" InputProps={{ sx: { borderRadius: 2 } }}>
            <MenuItem value="Bekliyor">Bekliyor</MenuItem><MenuItem value="İşleniyor">İşleniyor</MenuItem><MenuItem value="Çözüldü">Çözüldü</MenuItem>
          </TextField>
          {durum === "Çözüldü" && <TextField label="Çözüm Açıklaması" value={cozumAciklamasi} onChange={e => setCozumAciklamasi(e.target.value)} fullWidth multiline rows={3} margin="normal" InputProps={{ sx: { borderRadius: 2 } }} />}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setDurumDialog({ open: false, sikayetId: null })}>İptal</Button><Button onClick={handleDurumGuncelle} variant="contained" sx={{ borderRadius: 2 }}>Güncelle</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
export default YoneticiPaneli;