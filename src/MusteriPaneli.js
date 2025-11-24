import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Typography, TextField, Button, Paper, Chip, Alert, 
  FormControlLabel, Switch, CircularProgress, Grid, Card, CardContent, 
  Accordion, AccordionSummary, AccordionDetails, Fade, InputAdornment, Avatar
} from "@mui/material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SubjectIcon from '@mui/icons-material/Subject';
import DescriptionIcon from '@mui/icons-material/Description';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import TaskAltIcon from '@mui/icons-material/TaskAlt'; // Yeni ikon
import * as signalR from "@microsoft/signalr";

import { API_BASE_URL } from './config';

const statusColors = {
  "Çözüldü": { bg: "#e8f5e9", color: "#2e7d32", icon: <CheckCircleIcon fontSize="small" />, border: "#c8e6c9" },
  "İşleniyor": { bg: "#e3f2fd", color: "#1565c0", icon: <PendingActionsIcon fontSize="small" />, border: "#bbdefb" },
  "Bekliyor": { bg: "#fff3e0", color: "#e65100", icon: <AccessTimeIcon fontSize="small" />, border: "#ffe0b2" },
  "Varsayılan": { bg: "#f5f5f5", color: "#9e9e9e", icon: null, border: "#eeeeee" }
};

// --- YENİLENMİŞ KART TASARIMI ---
const SikayetCard = ({ s }) => {
    const status = statusColors[s.durum] || statusColors["Varsayılan"];
    const isResolved = s.durum === "Çözüldü";

    return (
        <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                borderRadius: "24px", 
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                border: isResolved ? "1px solid #a5d6a7" : "1px solid #f0f0f0", // Çözüldüyse yeşil çerçeve
                background: isResolved ? "linear-gradient(145deg, #ffffff 0%, #f1f8e9 100%)" : "linear-gradient(145deg, #ffffff, #fafafa)", 
                position: "relative",
                overflow: "visible",
                "&:hover": { 
                    transform: "translateY(-8px)", 
                    boxShadow: isResolved ? "0 12px 40px rgba(76, 175, 80, 0.2)" : "0 12px 30px rgba(0,0,0,0.08)" 
                } 
            }}>
                {/* Çözüldü Rozeti (Sadece Çözülenlerde Çıkar) */}
                {isResolved && (
                    <Box sx={{ 
                        position: "absolute", top: -10, right: 20, 
                        bgcolor: "#2e7d32", color: "white", 
                        px: 1.5, py: 0.5, borderRadius: "12px", 
                        fontSize: "0.75rem", fontWeight: "bold", 
                        boxShadow: "0 4px 10px rgba(46, 125, 50, 0.3)",
                        display: "flex", alignItems: "center", gap: 0.5, zIndex: 2
                    }}>
                        <TaskAltIcon fontSize="small" /> TAMAMLANDI
                    </Box>
                )}

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Üst Bilgi */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Chip 
                            icon={status.icon} 
                            label={s.durum} 
                            sx={{ 
                                bgcolor: status.bg, color: status.color, 
                                fontWeight: "800", borderRadius: "12px", height: "28px",
                                '& .MuiChip-icon': { fontSize: '18px' }
                            }} 
                        />
                        <Typography variant="caption" fontWeight="600" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.7 }}>
                            <AccessTimeIcon sx={{ fontSize: 14 }} /> 
                            {new Date(s.tarih).toLocaleDateString('tr-TR')}
                        </Typography>
                    </Box>
                    
                    {/* Konu Başlığı */}
                    <Typography variant="h6" fontWeight="800" sx={{ 
                        mb: 2, lineHeight: 1.3, minHeight: '3.9em', 
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        color: isResolved ? "#1b5e20" : "#333"
                    }}>
                        {s.konu}
                    </Typography>

                    {/* Açıklama Kutusu */}
                    <Paper elevation={0} sx={{ 
                        p: 2, 
                        bgcolor: isResolved ? "rgba(255,255,255,0.6)" : "#f8f9fa", 
                        borderRadius: "16px", 
                        mb: 3, 
                        minHeight: '80px',
                        border: "1px solid rgba(0,0,0,0.03)"
                    }}>
                        <Typography variant="body2" color="textSecondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                            {s.aciklama}
                        </Typography>
                    </Paper>

                    {/* Çözüm Alanı (Özel Tasarım) */}
                    {s.cozumAciklamasi && (
                        <Fade in={true}>
                            <Box sx={{ mt: 'auto' }}>
                                <Alert 
                                    icon={<CheckCircleIcon fontSize="inherit"/>} 
                                    severity="success" 
                                    sx={{ 
                                        borderRadius: "16px", 
                                        bgcolor: "#e8f5e9", 
                                        color: "#1b5e20", 
                                        border: '1px solid #c8e6c9', 
                                        '& .MuiAlert-icon': { color: '#2e7d32', fontSize: 22 },
                                        boxShadow: "0 4px 12px rgba(76, 175, 80, 0.1)"
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 0.5, color: "#2e7d32" }}>
                                        Çözüm Raporu
                                    </Typography>
                                    <Typography variant="body2" sx={{ lineHeight: 1.5, opacity: 0.9 }}>
                                        {s.cozumAciklamasi}
                                    </Typography>
                                </Alert>
                            </Box>
                        </Fade>
                    )}
                </CardContent>
            </Card>
        </Grid>
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

    const handleDurumGuncelle = (id, yeniDurum, cozum) => {
        setSikayetler(prev => prev.map(s => String(s.id) === String(id) ? { ...s, durum: yeniDurum, cozumAciklamasi: cozum } : s));
        if(yeniDurum === "Çözüldü") setMesaj("🎉 Harika! Bir şikayetiniz çözüldü!");
        setTimeout(() => setMesaj(""), 5000);
    };

    const handleAtama = (id) => {
        setSikayetler(prev => prev.map(s => String(s.id) === String(id) ? { ...s, durum: "İşleniyor" } : s));
        setMesaj("👨‍💻 Destek uzmanımız şikayetinizi incelemeye aldı.");
        setTimeout(() => setMesaj(""), 5000);
    };

    connection.on("SikayetDurumGuncellendi", handleDurumGuncelle);
    connection.on("SikayetAtandi", handleAtama);

    return () => {
        connection.off("SikayetDurumGuncellendi", handleDurumGuncelle);
        connection.off("SikayetAtandi", handleAtama);
    };
  }, [fetchSikayetler, kullaniciId, token]);

  const handleSikayetEkle = async (e) => {
    e.preventDefault();
    setMesaj("");
    setYukleniyor(true);
    try {
      const gonderilecekVeri = { ...yeniSikayet, kullaniciId, alpemixKodu: "" };
      const response = await fetch(`${API_BASE_URL}/api/Sikayet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(gonderilecekVeri)
      });
      if (response.ok) {
        setMesaj("✅ Talebiniz başarıyla oluşturuldu!");
        setYeniSikayet({ konu: "", aciklama: "", alpemixIsteniyor: false });
        fetchSikayetler(); 
        setExpandedPanel("bekleyen"); 
      } else { setMesaj("❌ Bir hata oluştu."); }
    } catch (err) { setMesaj("Sunucu hatası!"); } 
    finally { setYukleniyor(false); setTimeout(() => setMesaj(""), 4000); }
  };

  const bekleyenler = sikayetler.filter(s => s.durum === "Bekliyor");
  const islemdekiler = sikayetler.filter(s => s.durum === "İşleniyor");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  return (
    <Box sx={{ mt: 4, maxWidth: 1200, mx: "auto", px: 2 }}>
      
      <Box sx={{ mb: 5, textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 900, background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Müşteri Paneli
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Hoşgeldin {kullanici?.adSoyad}, taleplerini buradan yönetebilirsin.
        </Typography>
      </Box>

      {mesaj && <Fade in={true}><Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>{mesaj}</Alert></Fade>}

      {/* --- 1. YENİ TALEP OLUŞTUR --- */}
      <Accordion 
        expanded={expandedPanel === "yeniTalep"} 
        onChange={handleAccordionChange("yeniTalep")}
        sx={{ borderRadius: "16px !important", mb: 3, boxShadow: "0 8px 30px rgba(0,0,0,0.06)", border: "1px solid #e0e0e0", overflow: "hidden" }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f8faff", borderBottom: '1px solid #f0f0f0' }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <AddCircleOutlineIcon color="primary" />
                <Typography variant="h6" fontWeight="bold" color="primary">Yeni Destek Talebi Oluştur</Typography>
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 4 }}>
            <form onSubmit={handleSikayetEkle}>
              <Grid container spacing={3}>
                  <Grid item xs={12}>
                      <TextField 
                        fullWidth label="Konu Başlığı" placeholder="Örn: Fatura Yazdırılamıyor" variant="outlined" 
                        value={yeniSikayet.konu} onChange={(e) => setYeniSikayet({ ...yeniSikayet, konu: e.target.value })} 
                        required 
                        InputProps={{ startAdornment: <InputAdornment position="start"><SubjectIcon color="action"/></InputAdornment>, sx: { borderRadius: 3 } }} 
                      />
                  </Grid>
                  <Grid item xs={12}>
                      <TextField 
                        fullWidth label="Detaylı Açıklama" placeholder="Sorunu detaylıca anlatın..." variant="outlined" 
                        multiline rows={4} 
                        value={yeniSikayet.aciklama} onChange={(e) => setYeniSikayet({ ...yeniSikayet, aciklama: e.target.value })} 
                        required 
                        InputProps={{ startAdornment: <InputAdornment position="start" sx={{mt:1.5}}><DescriptionIcon color="action"/></InputAdornment>, sx: { borderRadius: 3, alignItems: 'flex-start' } }} 
                      />
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 3, border: "1px dashed #90caf9", display: 'flex', alignItems: 'center', height: '100%' }}>
                        <ScreenShareIcon color="primary" sx={{ mr: 2 }} />
                        <FormControlLabel 
                            control={<Switch checked={yeniSikayet.alpemixIsteniyor} onChange={(e) => setYeniSikayet({ ...yeniSikayet, alpemixIsteniyor: e.target.checked })} color="primary" />} 
                            label={<Box><Typography variant="body1" fontWeight="bold" color="#1565c0">Uzaktan Bağlantı (Alpemix)</Typography><Typography variant="caption" color="textSecondary">Bağlantı gerekirse işaretleyin</Typography></Box>} 
                            sx={{ m: 0, width: '100%' }}
                        />
                      </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Button type="submit" variant="contained" fullWidth sx={{ height: "100%", borderRadius: "16px", fontWeight: "800", fontSize: "1.1rem", background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)", boxShadow: "0 8px 20px rgba(33, 203, 243, 0.3)", textTransform: 'none' }} disabled={yukleniyor} endIcon={!yukleniyor && <SendIcon />}>
                        {yukleniyor ? <CircularProgress size={28} color="inherit" /> : "Talebi Oluştur ve Gönder"}
                      </Button>
                  </Grid>
              </Grid>
            </form>
        </AccordionDetails>
      </Accordion>

      {/* --- 2. BEKLEYEN TALEPLER --- */}
      <Accordion expanded={expandedPanel === "bekleyen"} onChange={handleAccordionChange("bekleyen")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(255, 152, 0, 0.1)", border: "1px solid #ffe0b2" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#fff3e0" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: '100%' }}>
                <AccessTimeIcon color="warning" />
                <Typography variant="h6" fontWeight="bold" color="textSecondary">Bekleyen Taleplerim</Typography>
                {bekleyenler.length > 0 && <Chip label={bekleyenler.length} size="small" color="warning" sx={{ ml: 'auto', fontWeight: 'bold' }} />}
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3, bgcolor: "#fffaf0" }}>
            <Grid container spacing={3}>
                {bekleyenler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Bekleyen talebiniz yok.</Typography> : bekleyenler.map(s => <SikayetCard key={s.id} s={s} />)}
            </Grid>
        </AccordionDetails>
      </Accordion>

      {/* --- 3. İŞLEMDEKİ TALEPLER --- */}
      <Accordion expanded={expandedPanel === "islemde"} onChange={handleAccordionChange("islemde")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(33, 150, 243, 0.1)", border: "1px solid #bbdefb" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e3f2fd" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: '100%' }}>
                <PendingActionsIcon color="primary" />
                <Typography variant="h6" fontWeight="bold" color="textSecondary">İşlemdeki Taleplerim</Typography>
                {islemdekiler.length > 0 && <Chip label={islemdekiler.length} size="small" color="primary" sx={{ ml: 'auto', fontWeight: 'bold' }} />}
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3, bgcolor: "#f1f8ff" }}>
            <Grid container spacing={3}>
                {islemdekiler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>İşlemde olan talebiniz yok.</Typography> : islemdekiler.map(s => <SikayetCard key={s.id} s={s} />)}
            </Grid>
        </AccordionDetails>
      </Accordion>

      {/* --- 4. ÇÖZÜLEN TALEPLER (PREMIUM) --- */}
      <Accordion expanded={expandedPanel === "cozulen"} onChange={handleAccordionChange("cozulen")} sx={{ borderRadius: "16px !important", mb: 2, boxShadow: "0 4px 12px rgba(76, 175, 80, 0.1)", border: "1px solid #c8e6c9" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e8f5e9" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: '100%' }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" fontWeight="bold" color="textSecondary">Çözülen Taleplerim</Typography>
                {cozulenler.length > 0 && <Chip label={cozulenler.length} size="small" color="success" sx={{ ml: 'auto', fontWeight: 'bold' }} />}
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3, bgcolor: "#f0fdf4" }}>
            <Grid container spacing={3}>
                {cozulenler.length === 0 ? <Typography color="textSecondary" sx={{ p: 2 }}>Henüz çözülen talebiniz yok.</Typography> : cozulenler.map(s => <SikayetCard key={s.id} s={s} />)}
            </Grid>
        </AccordionDetails>
      </Accordion>

    </Box>
  );
}
export default MusteriPaneli;