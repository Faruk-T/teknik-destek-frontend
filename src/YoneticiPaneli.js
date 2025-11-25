import React, { useEffect, useState, useCallback } from "react";
import {
  Typography, Box, Grid, Paper, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Avatar, Alert,
  Accordion, AccordionSummary, AccordionDetails, Card, CardContent, useTheme, Fade
} from "@mui/material";
import DashboardLayout from "./components/DashboardLayout";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { API_BASE_URL } from './config';

// --- RENK PALETLERİ (CI-VIL CI-VIL) ---
const STATUS_THEMES = {
  "Çözüldü": { 
      main: "#10b981", // Canlı Yeşil
      light: "#d1fae5", 
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      glow: "0 4px 20px rgba(16, 185, 129, 0.3)"
  },
  "İşleniyor": { 
      main: "#3b82f6", // Canlı Mavi
      light: "#dbeafe",
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      glow: "0 4px 20px rgba(59, 130, 246, 0.3)"
  },
  "Bekliyor": { 
      main: "#f59e0b", // Canlı Turuncu
      light: "#fef3c7",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      glow: "0 4px 20px rgba(245, 158, 11, 0.3)"
  }
};

// --- YENİLENMİŞ İSTATİSTİK KARTI ---
const StatCard = ({ title, value, theme, icon }) => (
    <Paper elevation={0} sx={{ 
        p: 3, borderRadius: 4, 
        background: theme.gradient, // Renk geçişli arka plan
        color: 'white', // Beyaz yazı
        height: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: theme.glow, // Hafif renkli parlama
        transition: 'transform 0.3s',
        '&:hover': { transform: 'translateY(-5px)' }
    }}>
        <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
            <Typography variant="h3" fontWeight="900">{value}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', width: 64, height: 64, borderRadius: 3 }}>
            {icon}
        </Avatar>
    </Paper>
);

// --- YENİLENMİŞ YÖNETİCİ ŞİKAYET KARTI ---
const AdminTicketCard = ({ sikayet, onAtama, onDurumGuncelle }) => {
    const theme = STATUS_THEMES[sikayet.durum] || STATUS_THEMES["Bekliyor"];

    return (
        <Card sx={{ 
            mb: 2, borderRadius: 3, 
            border: `1px solid ${theme.main}30`, // Hafif renkli kenarlık
            boxShadow: 'none',
            transition: 'all 0.3s ease',
            // Hover'da renkli parlama efekti
            '&:hover': { 
                boxShadow: theme.glow,
                borderColor: theme.main,
                transform: 'translateY(-3px)'
            }
        }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip 
                        label={sikayet.durum} 
                        sx={{ bgcolor: theme.light, color: theme.main, fontWeight: '900', borderRadius: 2 }} 
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'medium' }}>
                        {new Date(sikayet.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </Typography>
                </Box>
                
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem', mb: 1, color: '#1e293b' }}>{sikayet.konu}</Typography>
                <Typography variant="body2" color="textSecondary" paragraph sx={{ lineHeight: 1.6 }}>{sikayet.aciklama}</Typography>
                
                {sikayet.alpemixIsteniyor && (
                    <Alert severity="info" icon={<ScreenShareIcon fontSize="small"/>} sx={{ mb: 2, py: 0.5, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', '& .MuiAlert-icon': { color: '#3b82f6' } }}>
                        <Typography variant="body2" fontWeight="bold" color="#1e40af">Alpemix Kodu: {sikayet.alpemixKodu || "Bekleniyor..."}</Typography>
                    </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 3 }}>
                     <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: theme.main, color: 'white', fontWeight: 'bold' }}>{sikayet.kullanici?.adSoyad?.charAt(0)}</Avatar>
                     <Box>
                        <Typography variant="subtitle2" fontWeight="bold">{sikayet.kullanici?.adSoyad}</Typography>
                        <Typography variant="caption" color="textSecondary">{sikayet.kullanici?.sirketAdi}</Typography>
                     </Box>
                </Box>

                <Box sx={{ mt: 'auto' }}>
                    {!sikayet.yoneticiId ? (
                        <Button fullWidth variant="contained" size="medium" onClick={() => onAtama(sikayet.id)} startIcon={<AssignmentIndIcon />} sx={{ borderRadius: 3, bgcolor: theme.main, boxShadow: theme.glow, textTransform: 'none', fontWeight: 'bold' }}>Islemi Devral</Button>
                    ) : (
                        <Button fullWidth variant="contained" disableElevation size="medium" onClick={() => onDurumGuncelle(sikayet.id, sikayet.durum)} sx={{ borderRadius: 3, bgcolor: '#667eea', textTransform: 'none', fontWeight: 'bold' }}>Durumu Yönet</Button>
                    )}
                </Box>

                {sikayet.cozumAciklamasi && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#ecfdf5', borderRadius: 3, border: '1px solid #a7f3d0' }}>
                        <Typography variant="caption" fontWeight="900" color="#059669" display="block" sx={{ mb: 0.5 }}>✅ ÇÖZÜM RAPORU:</Typography>
                        <Typography variant="body2" color="#065f46" fontWeight="500">{sikayet.cozumAciklamasi}</Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

// --- YENİLENMİŞ AKORDİYON ---
const GroupAccordion = ({ title, count, tickets, onAtama, onDurumGuncelle, defaultExpanded, themeKey, icon }) => {
    const theme = STATUS_THEMES[themeKey];
    return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 3, borderRadius: '20px !important', '&:before': { display: 'none' }, border: `1px solid ${theme.main}20`, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: theme.main }} />} sx={{ bgcolor: theme.light, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 2 } }}>
            <Avatar sx={{ bgcolor: theme.main, width: 32, height: 32, color: 'white' }}>{icon}</Avatar>
            <Typography fontWeight="800" sx={{ fontSize: '1.05rem', color: theme.main, flexGrow: 1 }}>{title}</Typography>
            <Chip label={`${count} Talep`} size="small" sx={{ bgcolor: 'white', color: theme.main, fontWeight: 'bold' }} />
        </AccordionSummary>
        <AccordionDetails sx={{ bgcolor: '#fafafa', p: 3 }}>
            {tickets.length === 0 ? <Typography variant="body2" fontStyle="italic" color="textSecondary" align="center" sx={{ py: 2 }}>Bu kategoride kayıt bulunamadı.</Typography> : 
                <Grid container spacing={3}>
                    {tickets.map(s => (
                        <Grid item xs={12} lg={6} key={s.id}>
                            <AdminTicketCard sikayet={s} onAtama={onAtama} onDurumGuncelle={onDurumGuncelle} />
                        </Grid>
                    ))}
                </Grid>
            }
        </AccordionDetails>
    </Accordion>
)};

function YoneticiPaneli({ token, kullanici, onLogout }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [atamaDialog, setAtamaDialog] = useState({ open: false, sikayetId: null });
  const [durumDialog, setDurumDialog] = useState({ open: false, sikayetId: null });
  const [yoneticiId, setYoneticiId] = useState("");
  const [durum, setDurum] = useState("");
  const [cozumAciklamasi, setCozumAciklamasi] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [kullanicilar, setKullanicilar] = useState([]);
  const muiTheme = useTheme();

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
            setMesaj("🔔 Yeni bir şikayet eklendi!");
            fetchSikayetler();
            setTimeout(() => setMesaj(""), 4000);
        });
    }
  }, [fetchSikayetler, fetchYoneticiler]);

  const handleAtama = async () => {
    if (!yoneticiId) { setMesaj("❌ Lütfen bir yönetici seçin!"); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/${atamaDialog.sikayetId}/ata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ yoneticiId: Number(yoneticiId) })
      });
      if (response.ok) {
        setMesaj("✅ Atama başarılı!");
        setAtamaDialog({ open: false, sikayetId: null });
        setYoneticiId("");
        fetchSikayetler();
      } else setMesaj("❌ Atama yapılamadı.");
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

  // Gruplama
  const atanmamislar = sikayetler.filter(s => !s.yoneticiId);
  const banaAtananlar = sikayetler.filter(s => String(s.yoneticiId) === String(kullanici.kullaniciId) && s.durum !== "Çözüldü");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  const stats = {
      bekleyen: sikayetler.filter(s => s.durum === 'Bekliyor').length,
      islemde: sikayetler.filter(s => s.durum === 'İşleniyor').length,
      cozulen: cozulenler.length
  };

  return (
    <DashboardLayout title="Yönetim Paneli" user={kullanici} onLogout={onLogout}>
        <Box sx={{ mb: 5 }}>
            <Typography variant="h4" fontWeight="900" sx={{ 
                background: 'linear-gradient(45deg, #1e293b 30%, #3b82f6 90%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                mb: 1
            }}>
                Genel Bakış
            </Typography>
            <Typography variant="body1" color="textSecondary">Sistemdeki taleplerin anlık durum özeti.</Typography>
        </Box>

        {/* İstatistikler - CANLI KARTLAR */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={4}>
                <StatCard title="Bekleyen" value={stats.bekleyen} theme={STATUS_THEMES["Bekliyor"]} icon={<AccessTimeIcon fontSize="large" />} />
            </Grid>
            <Grid item xs={12} sm={4}>
                <StatCard title="İşlemde" value={stats.islemde} theme={STATUS_THEMES["İşleniyor"]} icon={<AssignmentIndIcon fontSize="large" />} />
            </Grid>
            <Grid item xs={12} sm={4}>
                <StatCard title="Çözülen" value={stats.cozulen} theme={STATUS_THEMES["Çözüldü"]} icon={<CheckCircleIcon fontSize="large" />} />
            </Grid>
        </Grid>

        {mesaj && <Fade in><Alert severity="info" sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{mesaj}</Alert></Fade>}

        {/* Gruplanmış Accordion Yapısı - RENKLİ BAŞLIKLAR */}
        <GroupAccordion 
            title="Atanmayı Bekleyen Talepler" 
            count={atanmamislar.length} 
            tickets={atanmamislar} 
            onAtama={(id) => setAtamaDialog({open:true, sikayetId:id})} 
            onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}}
            defaultExpanded={true}
            themeKey="Bekliyor"
            icon={<TrendingUpIcon />}
        />

        <GroupAccordion 
            title="Bana Atanan & İşlemdekiler" 
            count={banaAtananlar.length} 
            tickets={banaAtananlar} 
            onAtama={(id) => setAtamaDialog({open:true, sikayetId:id})} 
            onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}}
            defaultExpanded={true}
            themeKey="İşleniyor"
            icon={<AssignmentIndIcon />}
        />

        <GroupAccordion 
            title="Çözülen Talepler Arşivi" 
            count={cozulenler.length} 
            tickets={cozulenler} 
            onAtama={() => {}} 
            onDurumGuncelle={(id, d) => {setDurumDialog({open:true, sikayetId:id}); setDurum(d);}}
            defaultExpanded={false}
            themeKey="Çözüldü"
            icon={<CheckCircleIcon />}
        />

        {/* Dialoglar */}
        <Dialog open={atamaDialog.open} onClose={() => setAtamaDialog({ open: false, sikayetId: null })} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Yönetici Ata</DialogTitle>
            <DialogContent>
                <TextField select label="Yönetici Seç" value={yoneticiId} onChange={e => setYoneticiId(e.target.value)} fullWidth margin="normal" InputProps={{ sx: { borderRadius: 2 } }}>
                {kullanicilar.map(k => <MenuItem key={k.id} value={k.id}>{k.adSoyad}</MenuItem>)}
                </TextField>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setAtamaDialog({ open: false, sikayetId: null })} sx={{ borderRadius: 2 }}>İptal</Button>
                <Button onClick={handleAtama} variant="contained" sx={{ borderRadius: 2 }}>Ata</Button>
            </DialogActions>
        </Dialog>

        <Dialog open={durumDialog.open} onClose={() => setDurumDialog({ open: false, sikayetId: null })} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Durum Güncelle</DialogTitle>
            <DialogContent>
                <TextField select label="Durum" value={durum} onChange={e => setDurum(e.target.value)} fullWidth margin="normal" InputProps={{ sx: { borderRadius: 2 } }}>
                    <MenuItem value="Bekliyor">Bekliyor</MenuItem><MenuItem value="İşleniyor">İşleniyor</MenuItem><MenuItem value="Çözüldü">Çözüldü</MenuItem>
                </TextField>
                {durum === "Çözüldü" && <TextField label="Çözüm Açıklaması" value={cozumAciklamasi} onChange={e => setCozumAciklamasi(e.target.value)} fullWidth multiline rows={3} margin="normal" InputProps={{ sx: { borderRadius: 2 } }} />}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setDurumDialog({ open: false, sikayetId: null })} sx={{ borderRadius: 2 }}>İptal</Button>
                <Button onClick={handleDurumGuncelle} variant="contained" sx={{ borderRadius: 2 }}>Güncelle</Button>
            </DialogActions>
        </Dialog>
    </DashboardLayout>
  );
}
export default YoneticiPaneli;