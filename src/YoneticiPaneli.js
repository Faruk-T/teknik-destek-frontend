import React, { useEffect, useState, useCallback } from "react";
import {
  Typography, Box, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Alert, Chip,
  Grid, Avatar, Card, CardContent, CardActions, Fade, Accordion, AccordionSummary, AccordionDetails, Paper
} from "@mui/material";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { API_BASE_URL } from './config';

const statusStyles = {
  "Çözüldü": { bg: "#e8f5e9", color: "#2e7d32", icon: <CheckCircleIcon fontSize="small"/> },
  "İşleniyor": { bg: "#e3f2fd", color: "#1565c0", icon: <PendingActionsIcon fontSize="small"/> },
  "Bekliyor": { bg: "#fff3e0", color: "#e65100", icon: <AssignmentIndIcon fontSize="small"/> }
};

// Şık Kart Bileşeni
const SikayetCard = ({ sikayet, onAtama, onDurumGuncelle }) => {
  const style = statusStyles[sikayet.durum] || statusStyles["Bekliyor"];
  return (
    <Grid item xs={12} md={6} lg={4}>
        <Card sx={{ borderRadius: "20px", height: '100%', display: 'flex', flexDirection: 'column', boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0", transition: "0.3s", '&:hover': { transform: "translateY(-4px)", boxShadow: "0 12px 30px rgba(0,0,0,0.1)" } }}>
            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Chip icon={style.icon} label={sikayet.durum} sx={{ bgcolor: style.bg, color: style.color, fontWeight: "bold", borderRadius: "8px" }} size="small"/>
                    <Typography variant="caption" sx={{ bgcolor: "#f5f5f5", px: 1, py: 0.5, borderRadius: "6px", fontWeight: "600", color: "#666" }}>#{sikayet.id}</Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ minHeight: "3em", lineHeight: 1.3 }}>{sikayet.konu}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "#667eea", fontSize: 12 }}>{sikayet.kullanici?.adSoyad?.[0]}</Avatar>
                    <Typography variant="body2" fontWeight="500">{sikayet.kullanici?.adSoyad} <span style={{color:"#999"}}>({sikayet.kullanici?.sirketAdi})</span></Typography>
                </Box>
                <Paper elevation={0} sx={{ bgcolor: "#fafafa", p: 2, borderRadius: "12px", mb: 2, maxHeight: "100px", overflowY: "auto" }}>
                    <Typography variant="body2" color="textSecondary">{sikayet.aciklama}</Typography>
                </Paper>
                {sikayet.alpemixIsteniyor && <Alert severity="warning" icon={false} sx={{ py: 0.5, borderRadius: "8px", fontSize: "0.8rem" }}>🚨 Uzaktan Bağlantı</Alert>}
            </CardContent>
            <CardActions sx={{ p: 2, pt: 0, justifyContent: "flex-end", gap: 1 }}>
                {!sikayet.yoneticiId ? (
                    <Button variant="outlined" size="small" onClick={() => onAtama(sikayet.id, "")} startIcon={<AssignmentIndIcon />} sx={{ borderRadius: "8px", textTransform: "none" }}>Ata</Button>
                ) : (
                    <Chip label="Atandı" size="small" variant="outlined" color="primary" icon={<PersonIcon />} />
                )}
                <Button variant="contained" size="small" onClick={() => onDurumGuncelle(sikayet.id, sikayet.durum)} disableElevation sx={{ borderRadius: "8px", textTransform: "none", bgcolor: "#667eea" }}>Güncelle</Button>
            </CardActions>
        </Card>
    </Grid>
  );
};

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
        setKullanicilar(data.filter(k => k.rol === "yonetici"));
      }
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => {
    fetchSikayetler();
    fetchYoneticiler();
    if (window.signalRConnection) {
        window.signalRConnection.on("YeniSikayetEklendi", () => {
            setMesaj("🔔 Yeni bir şikayet sisteme düştü!");
            fetchSikayetler();
            setTimeout(() => setMesaj(""), 4000);
        });
    }
  }, [fetchSikayetler, fetchYoneticiler]);

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

  // Filtreler
  const atanmamislar = sikayetler.filter(s => !s.yoneticiId);
  const banaAtananlar = sikayetler.filter(s => String(s.yoneticiId) === String(kullanici.kullaniciId) && s.durum !== "Çözüldü");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  const handleChangePanel = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  return (
    <Box sx={{ mt: 4, maxWidth: 1400, mx: "auto" }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" fontWeight="800" sx={{ background: "linear-gradient(45deg, #2196F3, #21CBF3)", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Yönetim Paneli</Typography>
        <Typography color="textSecondary">Hoşgeldin, {kullanici.adSoyad}</Typography>
      </Box>

      {mesaj && <Fade in={true}><Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>{mesaj}</Alert></Fade>}

      {/* --- 1. ATANMAMIŞ ŞİKAYETLER --- */}
      <Accordion expanded={expandedPanel === "atanmamis"} onChange={handleChangePanel("atanmamis")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(244, 67, 54, 0.1)", border: "1px solid #ffcdd2" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#ffebee" }}>
           <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: '100%' }}>
               <AccessTimeIcon color="error"/>
               <Typography variant="h6" color="error" fontWeight="bold">Atanmamış Talepler</Typography>
               {atanmamislar.length > 0 && <Chip label={atanmamislar.length} color="error" size="small" sx={{ ml: 'auto', fontWeight: 'bold' }} />}
           </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3, bgcolor: "#fff5f5" }}>
            <Grid container spacing={3}>
                {atanmamislar.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Bekleyen talep yok.</Typography> : 
                    atanmamislar.map(s => <SikayetCard key={s.id} sikayet={s} onAtama={(id) => {setAtamaDialog({open:true, sikayetId:id})}} onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}} />)
                }
            </Grid>
        </AccordionDetails>
      </Accordion>

      {/* --- 2. BANA ATANANLAR --- */}
      <Accordion expanded={expandedPanel === "bana"} onChange={handleChangePanel("bana")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(33, 150, 243, 0.1)", border: "1px solid #bbdefb" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e3f2fd" }}>
           <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: '100%' }}>
               <PersonIcon color="primary"/>
               <Typography variant="h6" color="primary" fontWeight="bold">Bana Atananlar</Typography>
               {banaAtananlar.length > 0 && <Chip label={banaAtananlar.length} color="primary" size="small" sx={{ ml: 'auto', fontWeight: 'bold' }} />}
           </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3, bgcolor: "#f1f8ff" }}>
            <Grid container spacing={3}>
                {banaAtananlar.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Üzerinizde aktif görev yok.</Typography> : 
                    banaAtananlar.map(s => <SikayetCard key={s.id} sikayet={s} onAtama={(id) => {setAtamaDialog({open:true, sikayetId:id})}} onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}} />)
                }
            </Grid>
        </AccordionDetails>
      </Accordion>

      {/* --- 3. ÇÖZÜLENLER --- */}
      <Accordion expanded={expandedPanel === "cozulen"} onChange={handleChangePanel("cozulen")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(76, 175, 80, 0.1)", border: "1px solid #c8e6c9" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e8f5e9" }}>
           <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: '100%' }}>
               <CheckCircleIcon color="success"/>
               <Typography variant="h6" color="success" fontWeight="bold">Çözülen Talepler</Typography>
               {cozulenler.length > 0 && <Chip label={cozulenler.length} color="success" size="small" sx={{ ml: 'auto', fontWeight: 'bold' }} />}
           </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3, bgcolor: "#f0fdf4" }}>
            <Grid container spacing={3}>
                {cozulenler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Henüz çözülen talep yok.</Typography> : 
                    cozulenler.map(s => <SikayetCard key={s.id} sikayet={s} onAtama={() => {}} onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}} />)
                }
            </Grid>
        </AccordionDetails>
      </Accordion>

      {/* --- Dialoglar (Aynı) --- */}
      <Dialog open={atamaDialog.open} onClose={() => setAtamaDialog({ open: false, sikayetId: null })} PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}>
        <DialogTitle>👨‍💼 Yönetici Ata</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <TextField select label="Yönetici Seç" value={yoneticiId} onChange={e => setYoneticiId(e.target.value)} fullWidth sx={{ mt: 2 }} variant="filled" InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }}>
            {kullanicilar.map(k => <MenuItem key={k.id} value={k.id}>{k.adSoyad}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAtamaDialog({ open: false, sikayetId: null })}>İptal</Button>
          <Button onClick={handleAtama} variant="contained" sx={{ borderRadius: "8px" }}>Ata</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={durumDialog.open} onClose={() => setDurumDialog({ open: false, sikayetId: null })} PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}>
        <DialogTitle>📝 Durum Güncelle</DialogTitle>
        <DialogContent sx={{ minWidth: 350 }}>
          <TextField select label="Durum" value={durum} onChange={e => setDurum(e.target.value)} fullWidth sx={{ mt: 2 }} variant="filled" InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }}>
            <MenuItem value="Bekliyor">Bekliyor</MenuItem>
            <MenuItem value="İşleniyor">İşleniyor</MenuItem>
            <MenuItem value="Çözüldü">Çözüldü</MenuItem>
          </TextField>
          {durum === "Çözüldü" && <TextField label="Çözüm Açıklaması" value={cozumAciklamasi} onChange={e => setCozumAciklamasi(e.target.value)} fullWidth multiline rows={4} sx={{ mt: 2 }} variant="filled" InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }} placeholder="Sorunu nasıl çözdünüz?" />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDurumDialog({ open: false, sikayetId: null })}>İptal</Button>
          <Button onClick={handleDurumGuncelle} variant="contained" sx={{ borderRadius: "8px", bgcolor: "#667eea" }}>Güncelle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
export default YoneticiPaneli;