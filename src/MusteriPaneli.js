import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Typography, TextField, Button, Paper, Chip, Grid,
  FormControlLabel, Switch, CircularProgress, Alert, Card, CardContent,
  Avatar, Accordion, AccordionSummary, AccordionDetails, Container, Fade
} from "@mui/material";
import DashboardLayout from "./components/DashboardLayout";
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from './config';

// --- RENK VE STİL PALETİ (CI-VIL CI-VIL) ---
const STATUS_CONFIG = {
  "Çözüldü": { 
      bg: "#dcfce7", color: "#166534", icon: <CheckCircleOutlineIcon fontSize="small"/>, label: "Çözüldü",
      glow: "0 4px 20px rgba(22, 101, 52, 0.2)", borderColor: "#22c55e"
  },
  "İşleniyor": { 
      bg: "#dbeafe", color: "#1e40af", icon: <AccessTimeIcon fontSize="small"/>, label: "İşleniyor",
      glow: "0 4px 20px rgba(30, 64, 175, 0.2)", borderColor: "#3b82f6"
  },
  "Bekliyor": { 
      bg: "#ffedd5", color: "#9a3412", icon: <ErrorOutlineIcon fontSize="small"/>, label: "Bekliyor",
      glow: "0 4px 20px rgba(154, 52, 18, 0.2)", borderColor: "#f97316"
  }
};

// --- MODERN HEADER BİLEŞENİ (Daha canlı) ---
const WelcomeBanner = ({ user }) => (
    <Paper 
        elevation={0} 
        sx={{ 
            p: { xs: 3, md: 5 }, 
            mb: 5, 
            borderRadius: 5, 
            // Daha canlı bir mor-mavi geçişi
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px -10px rgba(139, 92, 246, 0.5)'
        }}
    >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Typography variant="h3" fontWeight="900" gutterBottom sx={{ letterSpacing: '-1px' }}>
                Hoşgeldiniz, {user?.adSoyad?.split(' ')[0]}! 🚀
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '600px', fontWeight: 'medium' }}>
                Teknik destek portalınız hazır. Sorunlarınızı hızlıca çözmek için buradayız.
            </Typography>
        </Box>
        
        {/* Dekoratif Arka Plan Şekilleri */}
        <Box sx={{ position: 'absolute', top: '-50%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)' }} />
        <Box sx={{ position: 'absolute', bottom: '-30%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)' }} />
    </Paper>
);

// --- YENİ TALEP FORMU BİLEŞENİ (Gölgeli ve Canlı) ---
const NewTicketForm = ({ onSubmit, loading, values, setValues }) => (
  <Card sx={{ 
      borderRadius: 5, border: 'none', 
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', // Daha belirgin gölge
      overflow: 'visible',
      background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)'
    }}>
      <Box sx={{ p: 4, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Avatar sx={{ 
              bgcolor: 'transparent', 
              color: 'white', 
              borderRadius: 3, 
              width: 56, height: 56,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.4)'
            }}>
              <RateReviewIcon fontSize="large" />
          </Avatar>
          <Box>
              <Typography variant="h5" fontWeight="900" color="#1e293b" sx={{ letterSpacing: '-0.5px' }}>Yeni Talep Oluştur</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="medium">Sorununuzu detaylandırın, hemen ilgilenelim.</Typography>
          </Box>
      </Box>

      <CardContent sx={{ p: 4 }}>
          <form onSubmit={onSubmit}>
                <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1, color: '#334155', ml: 0.5 }}>KONU BAŞLIĞI</Typography>
                <TextField 
                  fullWidth 
                  placeholder="Örn: Sistem giriş hatası hk." 
                  variant="outlined" 
                  value={values.konu} 
                  onChange={(e) => setValues({ ...values, konu: e.target.value })} 
                  required 
                  sx={{ mb: 3.5, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' } }} 
                />
                
                <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1, color: '#334155', ml: 0.5 }}>DETAYLI AÇIKLAMA</Typography>
                <TextField 
                  fullWidth 
                  multiline rows={5} 
                  value={values.aciklama} 
                  onChange={(e) => setValues({ ...values, aciklama: e.target.value })} 
                  required 
                  placeholder="Lütfen yaşadığınız sorunu, aldığınız hata kodlarını detaylıca yazınız..."
                  sx={{ mb: 3.5, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' } }} 
                />
                
                {/* ALPEMIX ALANI (Renklendirilmiş) */}
                <Paper elevation={0} sx={{ p: 3, bgcolor: '#f0f9ff', borderRadius: 4, border: '1px dashed #38bdf8', transition: 'all 0.3s', ...(values.alpemixIsteniyor && { bgcolor: '#e0f2fe', borderColor: '#0ea5e9', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)' }) }}>
                  <FormControlLabel 
                    control={<Switch checked={values.alpemixIsteniyor} onChange={(e) => setValues({ ...values, alpemixIsteniyor: e.target.checked })} />} 
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: values.alpemixIsteniyor ? '#0284c7' : '#475569' }}>
                            <ScreenShareIcon color={values.alpemixIsteniyor ? "primary" : "action"} /> 
                            <Box>
                                <Typography variant="subtitle2" fontWeight="800">Uzaktan Bağlantı (Alpemix) Gerekli</Typography>
                                <Typography variant="caption" fontWeight="medium">Destek ekibinin bağlanması gerekiyorsa işaretleyin.</Typography>
                            </Box>
                        </Box>
                    } 
                  />
                  
                  <Fade in={values.alpemixIsteniyor}>
                    <Box sx={{ display: values.alpemixIsteniyor ? 'block' : 'none', mt: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={7}>
                                <TextField 
                                    fullWidth label="ID (9 Rakam)" 
                                    value={values.alpemixId || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                        setValues({...values, alpemixId: val});
                                    }}
                                    required={values.alpemixIsteniyor}
                                    placeholder="XXX XXX XXX"
                                    InputProps={{ sx: { bgcolor: 'white', borderRadius: 2.5 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField 
                                    fullWidth label="Parola (5 Rakam)" 
                                    value={values.alpemixPass || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                        setValues({...values, alpemixPass: val});
                                    }}
                                    required={values.alpemixIsteniyor}
                                    placeholder="XXXXX"
                                    InputProps={{ sx: { bgcolor: 'white', borderRadius: 2.5 } }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                  </Fade>
                </Paper>

                <Button 
                    type="submit" variant="contained" fullWidth size="large" 
                    sx={{ 
                        mt: 4, py: 2, borderRadius: 4, textTransform: 'none', fontSize: '1.1rem', fontWeight: '800',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                        boxShadow: '0 12px 25px -8px rgba(99, 102, 241, 0.6)',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 15px 30px -8px rgba(99, 102, 241, 0.7)' }
                    }} 
                    disabled={loading}
                >
                  {loading ? <CircularProgress size={28} color="inherit" /> : "Talebi Gönder 🚀"}
                </Button>
          </form>
      </CardContent>
  </Card>
);

// --- GEÇMİŞ LİSTE BİLEŞENİ (Renkli ve Parlayan) ---
const TicketGroupAccordion = ({ title, count, tickets, defaultExpanded, themeKey }) => {
    const theme = STATUS_CONFIG[themeKey];
    return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ 
        mb: 3, borderRadius: '20px !important', bgcolor: 'white', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
        border: `1px solid ${theme.borderColor}30`, // Hafif renkli kenarlık
        '&:before': { display: 'none' },
        overflow: 'hidden'
    }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: theme.borderColor }} />} sx={{ bgcolor: theme.bg }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography fontWeight="800" sx={{ fontSize: '1.05rem', color: theme.color }}>{title}</Typography>
                <Chip label={count} size="small" sx={{ borderRadius: 3, height: 22, fontSize: '0.75rem', fontWeight: '900', bgcolor: 'white', color: theme.color }} />
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ bgcolor: '#f8fafc', p: 3, borderTop: `1px solid ${theme.borderColor}20` }}>
            {tickets.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2, opacity: 0.7 }}>Bu kategoride henüz bir kayıt yok.</Typography>
            ) : (
                tickets.map(s => {
                    const status = STATUS_CONFIG[s.durum] || STATUS_CONFIG["Bekliyor"];
                    return (
                        <Card key={s.id} sx={{ 
                            mb: 2.5, borderRadius: 4, 
                            border: `1px solid ${status.borderColor}40`, // Duruma göre kenarlık rengi
                            boxShadow: 'none', 
                            transition: 'all 0.3s ease', 
                            // Hover'da renkli parlama efekti
                            '&:hover': { 
                                transform: 'translateY(-3px) translateX(3px)', 
                                boxShadow: status.glow,
                                borderColor: status.borderColor
                            } 
                        }}>
                            <CardContent sx={{ p: 3, pb: '24px !important' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Chip 
                                        icon={status.icon} label={status.label} size="small" 
                                        sx={{ bgcolor: status.bg, color: status.color, fontWeight: '900', borderRadius: 2.5, border: 'none', px: 0.5 }} 
                                    />
                                    <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ opacity: 0.8 }}>
                                        {new Date(s.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Box>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#1e293b', mb: 1, lineHeight: 1.3 }}>{s.konu}</Typography>
                                <Typography variant="body2" color="#475569" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{s.aciklama}</Typography>
                                
                                {s.cozumAciklamasi && (
                                    <Box sx={{ mt: 2.5, bgcolor: '#ecfdf5', p: 2.5, borderRadius: 3, border: '1px solid #a7f3d0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#059669' }} />
                                            <Typography variant="subtitle2" fontWeight="900" color="#065f46">ÇÖZÜM RAPORU</Typography>
                                        </Box>
                                        <Typography variant="body2" color="#047857" sx={{ fontWeight: 600, lineHeight: 1.5 }}>{s.cozumAciklamasi}</Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </AccordionDetails>
    </Accordion>
)};

// --- ANA SAYFA ---
function MusteriPaneli({ token, kullaniciId, kullanici, onLogout }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [yeniSikayet, setYeniSikayet] = useState({ konu: "", aciklama: "", alpemixIsteniyor: false, alpemixId: "", alpemixPass: "" });
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const fetchSikayetler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/kullanici/${kullaniciId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSikayetler(data.reverse());
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
    
    if (yeniSikayet.alpemixIsteniyor) {
        if (yeniSikayet.alpemixId.length !== 9 || yeniSikayet.alpemixPass.length !== 5) {
            alert("Lütfen geçerli bir 9 haneli Alpemix ID ve 5 haneli Parola giriniz.");
            return;
        }
    }

    setMesaj(""); setYukleniyor(true);
    try {
      const alpemixKoduFull = yeniSikayet.alpemixIsteniyor 
          ? `ID: ${yeniSikayet.alpemixId} - Pass: ${yeniSikayet.alpemixPass}` 
          : "";

      const gonderilecekVeri = { 
          konu: yeniSikayet.konu,
          aciklama: yeniSikayet.aciklama,
          alpemixIsteniyor: yeniSikayet.alpemixIsteniyor,
          alpemixKodu: alpemixKoduFull,
          kullaniciId 
      };

      const response = await fetch(`${API_BASE_URL}/api/Sikayet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(gonderilecekVeri)
      });

      if (response.ok) {
        setMesaj("✅ Talep başarıyla oluşturuldu!");
        setYeniSikayet({ konu: "", aciklama: "", alpemixIsteniyor: false, alpemixId: "", alpemixPass: "" });
        fetchSikayetler(); 
      } else { setMesaj("❌ Hata oluştu."); }
    } catch (err) { setMesaj("Sunucu hatası!"); } 
    finally { setYukleniyor(false); setTimeout(() => setMesaj(""), 4000); }
  };

  // GRUPLAMA
  const bekleyenler = sikayetler.filter(s => s.durum === "Bekliyor");
  const islemdekiler = sikayetler.filter(s => s.durum === "İşleniyor");
  const cozulenler = sikayetler.filter(s => s.durum === "Çözüldü");

  return (
      <DashboardLayout title="Müşteri Portalı" user={kullanici} onLogout={onLogout}>
          <Container maxWidth="xl" disableGutters sx={{ px: {xs: 2, md: 4} }}>
              {mesaj && <Fade in><Alert severity="success" variant="filled" sx={{ mb: 4, borderRadius: 4, fontWeight: 'bold', boxShadow: '0 8px 20px -5px rgba(34, 197, 94, 0.5)' }}>{mesaj}</Alert></Fade>}
              
              <WelcomeBanner user={kullanici} />

              <Grid container spacing={5}>
                  {/* Sol Taraf: Form */}
                  <Grid item xs={12} lg={5}>
                      <Box sx={{ position: 'sticky', top: 120 }}>
                        <NewTicketForm 
                            onSubmit={handleSikayetEkle} 
                            loading={yukleniyor} 
                            values={yeniSikayet} 
                            setValues={setYeniSikayet} 
                        />
                      </Box>
                  </Grid>

                  {/* Sağ Taraf: Liste */}
                  <Grid item xs={12} lg={7}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 4, mt: { xs: 4, lg: 0 } }}>
                           <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 56, height: 56, borderRadius: 3, boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)' }}>
                                <HistoryIcon fontSize="large" />
                           </Avatar>
                           <Box>
                                <Typography variant="h4" fontWeight="900" color="#0f172a" sx={{ letterSpacing: '-0.5px' }}>Talep Geçmişi</Typography>
                                <Typography variant="body1" color="text.secondary" fontWeight="medium">Önceki tüm destek taleplerinizin durumu.</Typography>
                           </Box>
                      </Box>
                      
                      <TicketGroupAccordion title="Bekleyen Talepler" count={bekleyenler.length} tickets={bekleyenler} defaultExpanded={true} themeKey="Bekliyor" />
                      <TicketGroupAccordion title="İşlemdekiler" count={islemdekiler.length} tickets={islemdekiler} defaultExpanded={true} themeKey="İşleniyor" />
                      <TicketGroupAccordion title="Çözülenler Arşivi" count={cozulenler.length} tickets={cozulenler} defaultExpanded={false} themeKey="Çözüldü" />
                  </Grid>
              </Grid>
          </Container>
      </DashboardLayout>
  );
}

export default MusteriPaneli;