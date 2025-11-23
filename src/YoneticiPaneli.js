import React, { useEffect, useState, useRef } from "react";
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
  Avatar,
  Paper,
  Drawer,
  IconButton,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  CircularProgress
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from '@mui/icons-material/History';
import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';

let connection = null;

// Memoized utility functions
const durumRenk = (durum) => {
  if (durum === "Çözüldü") return "success";
  if (durum === "İşleniyor") return "info";
  return "warning";
};

// Memoized list item component for better performance
const SikayetListItem = React.memo(({ sikayet, onAtama, onDurumGuncelle, kullanici }) => {
  const handleAtama = React.useCallback(() => {
    onAtama(sikayet.id, sikayet.yoneticiId || "");
  }, [sikayet.id, sikayet.yoneticiId, onAtama]);

  const handleDurumGuncelle = React.useCallback(() => {
    onDurumGuncelle(sikayet.id, sikayet.durum);
  }, [sikayet.id, sikayet.durum, onDurumGuncelle]);

  return (
    <ListItem alignItems="flex-start" sx={{ border: "none", mb: 3, p: 0, background: "none" }}>
      <Paper sx={{ p: { xs: 1, sm: 2 }, width: "100%", boxShadow: 3, borderRadius: 3, mx: { xs: 0.25, sm: 0 } }}>
        {/* Konu ve Durum */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", flex: 1 }}>
            <span style={{ fontWeight: 700 }}>Konu:</span> {sikayet.konu}
          </Typography>
          <Chip label={sikayet.durum} color={durumRenk(sikayet.durum)} size="medium" sx={{ fontWeight: "bold", fontSize: 16 }} />
        </Box>
        {/* Sorun Sahibi ve Şirket */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Avatar sx={{ width: 36, height: 36 }}>{sikayet.kullanici?.adSoyad?.[0]}</Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Sorun Sahibi: {sikayet.kullanici?.adSoyad}
            </Typography>
            <Typography variant="body1" sx={{ color: "#1976d2", fontWeight: 500 }}>
              Şirket: {sikayet.kullanici?.sirketAdi}
            </Typography>
          </Box>
        </Box>
        {/* Alpemix Kodu */}
        {sikayet.alpemixIsteniyor && (
          <Box sx={{ mt: 2, p: 2, background: "#fffde7", borderRadius: 2, border: "1px solid #ffecb3" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#f57f17" }}>
              Alpemix Kodu: {sikayet.alpemixKodu}
            </Typography>
          </Box>
        )}
        {/* Sorun Açıklaması */}
        <Box sx={{ background: "#f5f5f5", borderRadius: 2, p: 2, my: 2, borderLeft: "4px solid #1976d2" }}>
          <Typography variant="overline" sx={{ color: '#888', letterSpacing: 1, fontWeight: 600, mb: 0.5 }}>
            Sorun
          </Typography>
          <Typography variant="body1" sx={{ fontStyle: "italic" }}>
            {sikayet.aciklama}
          </Typography>
        </Box>
        {sikayet.cozumAciklamasi && (
          <Box sx={{ background: "#ecfdf5", borderRadius: 2, p: 2, my: 2, borderLeft: "4px solid #10b981" }}>
            <Typography variant="overline" sx={{ color: '#059669', letterSpacing: 1, fontWeight: 700, mb: 0.5 }}>
              Çözüm
            </Typography>
            <Typography variant="body1">
              {sikayet.cozumAciklamasi}
            </Typography>
          </Box>
        )}
        {/* Tarih ve Atanan Yönetici */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
          <Typography variant="body1" sx={{ color: "#333", fontWeight: 500, display: "flex", alignItems: "center", gap: 1 }}>
            <span role="img" aria-label="tarih">🕒</span> {new Date(sikayet.tarih).toLocaleString()}
          </Typography>
          <Typography variant="body1" sx={{ color: "#333", fontWeight: 500, display: "flex", alignItems: "center", gap: 1 }}>
            <span role="img" aria-label="yönetici">👤</span> {sikayet.yonetici?.adSoyad || "Atanmamış"}
          </Typography>
        </Box>
        {/* Butonlar */}
        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="medium"
            onClick={handleAtama}
          >
            Ata
          </Button>
          <Button
            variant="outlined"
            size="medium"
            onClick={handleDurumGuncelle}
          >
            Durum Güncelle
          </Button>
        </Box>
      </Paper>
    </ListItem>
  );
});

function YoneticiPaneli({ token, kullanici, selectedTicketId, showTicketDetails, onTicketDetailsClose, pendingMessages, unreadDirectMessages }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [cozulenler, setCozulenler] = useState([]);
  const [atamaDialog, setAtamaDialog] = useState({ open: false, sikayetId: null });
  const [durumDialog, setDurumDialog] = useState({ open: false, sikayetId: null });
  const [yoneticiId, setYoneticiId] = useState("");
  const [durum, setDurum] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [kullanicilar, setKullanicilar] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [yapilanIsler, setYapilanIsler] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState(false);
  const [cozumAciklamasi, setCozumAciklamasi] = useState("");
  const [banaAtananYeniSayisi, setBanaAtananYeniSayisi] = useState(0);
  const apiUrl = process.env.REACT_APP_API_URL || "http://192.168.1.14:5106";
  const [banaAtananlar, setBanaAtananlar] = useState([]);
  const [gunlukCozulenler, setGunlukCozulenler] = useState([]);
  const [gunlukOzet, setGunlukOzet] = useState(null);
  const [gunlukPanelAcik, setGunlukPanelAcik] = useState(false);
  const [gunlukLoading, setGunlukLoading] = useState(false);
  const [gunlukError, setGunlukError] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    sikayetler: false,
    cozulenler: false,
    yapilanIsler: false,
    gunluk: false
  });

  // Refs for cleanup
  const signalRTimeoutRef = useRef(null);
  const signalRIntervalRef = useRef(null);

  // Memoized API calls to prevent unnecessary re-renders
  const fetchYoneticiler = React.useCallback(async () => {
    if (loadingStates.yoneticiler) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, yoneticiler: true }));
      const response = await fetch(`${apiUrl}/api/Kullanici`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setKullanicilar(data.filter(k => k.rol === "yonetici"));
      }
    } catch {
      setKullanicilar([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, yoneticiler: false }));
    }
  }, [apiUrl, token, loadingStates.yoneticiler]);

  const fetchYapilanIsler = React.useCallback(async () => {
    if (loadingStates.yapilanIsler) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, yapilanIsler: true }));
      const response = await fetch(`${apiUrl}/api/YapilanIsler/tum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setYapilanIsler(data);
      }
    } catch {
      setYapilanIsler([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, yapilanIsler: false }));
    }
  }, [apiUrl, token, loadingStates.yapilanIsler]);

  const fetchSikayetler = React.useCallback(async () => {
    if (loadingStates.sikayetler) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, sikayetler: true }));
      const response = await fetch(`${apiUrl}/api/Sikayet/tum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSikayetler(data);
      }
    } catch {
      setSikayetler([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, sikayetler: false }));
    }
  }, [apiUrl, token, loadingStates.sikayetler]);

  const fetchCozulenler = React.useCallback(async () => {
    if (loadingStates.cozulenler) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, cozulenler: true }));
      const response = await fetch(`${apiUrl}/api/Sikayet/cozulenlerim/${kullanici.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCozulenler(data);
      }
    } catch {
      setCozulenler([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, cozulenler: false }));
    }
  }, [apiUrl, token, kullanici.id, loadingStates.cozulenler]);

  const fetchGunlukCozulenler = React.useCallback(async () => {
    if (loadingStates.gunluk) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, gunluk: true }));
      setGunlukError(null);
      
      const response = await fetch(`${apiUrl}/api/Sikayet/gunluk-cozulenler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGunlukCozulenler(data);
      } else {
        const errorText = await response.text();
        setGunlukError(`API Hatası: ${response.status} - ${errorText}`);
        setGunlukCozulenler([]);
      }
    } catch (error) {
      setGunlukError(`Bağlantı Hatası: ${error.message}`);
      setGunlukCozulenler([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, gunluk: false }));
    }
  }, [apiUrl, token, loadingStates.gunluk]);

  const fetchGunlukOzet = React.useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/Sikayet/gunluk-ozet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGunlukOzet(data);
      } else {
        setGunlukOzet(null);
      }
    } catch (error) {
      setGunlukOzet(null);
    }
  }, [apiUrl, token]);

  // Memoized computed values
  const atanmamislar = React.useMemo(() => 
    sikayetler.filter(s => s.yoneticiId == null || s.yoneticiId === 0 || s.yoneticiId === ""),
    [sikayetler]
  );

  const banaAtananlarUi = React.useMemo(() => {
    if (banaAtananlar && banaAtananlar.length > 0) {
      return banaAtananlar.filter(s => s.durum !== "Çözüldü");
    }
    return sikayetler.filter(s => {
      const assignedId = s.yoneticiId ?? s.YoneticiId ?? s.yonetici?.id ?? s.Yonetici?.Id;
      return String(assignedId) === String(kullanici.id) && s.durum !== "Çözüldü";
    });
  }, [banaAtananlar, sikayetler, kullanici.id]);

  // Memoized event handlers
  const handleAtamaClick = React.useCallback((sikayetId, yoneticiId) => {
    setAtamaDialog({ open: true, sikayetId });
    setYoneticiId(yoneticiId);
  }, []);

  const handleDurumGuncelleClick = React.useCallback((sikayetId, currentDurum) => {
    setDurumDialog({ open: true, sikayetId });
    setDurum(currentDurum);
  }, []);

  const handleAccordionChange = React.useCallback((panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
    
    if (panel === "cozulenler" && isExpanded) fetchCozulenler();
    if (panel === "atanmamis" && isExpanded) fetchSikayetler();
    if (panel === "banaatanan" && isExpanded) {
      // Bana atananları özellikle yenile
      (async () => {
        try {
          const resp = await fetch(`${apiUrl}/api/Sikayet/bana-atananlar/${kullanici.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            setBanaAtananlar(await resp.json());
          }
        } catch {}
      })();
      setBanaAtananYeniSayisi(0);
    }
    if (panel === "gunlukTakip" && isExpanded) {
      fetchGunlukCozulenler();
      fetchGunlukOzet();
    }
  }, [fetchCozulenler, fetchSikayetler, fetchGunlukCozulenler, fetchGunlukOzet, apiUrl, kullanici.id, token]);

  // Event handler'ları ayarlayan fonksiyon
  const setupEventHandlers = React.useCallback((conn) => {
    const handleNewMessage = (msg) => {
      if (msg && !msg.ticketId) {
        console.log("Direkt mesaj alındı:", msg.content);
      } else {
        setMesaj("Yeni mesaj alındı!");
        setTimeout(() => setMesaj(""), 3000);
      }
    };
    
    conn.on("ReceiveMessage", handleNewMessage);
    
    conn.on("YeniSikayetEklendi", (sikayetId, konu, aciklama, kullaniciId) => {
      fetchSikayetler();
      setMesaj("Yeni şikayet eklendi!");
      setTimeout(() => setMesaj(""), 3000);
    });

    conn.on("SikayetDurumGuncellendi", (sikayetId, yeniDurum, cozumAciklamasi) => {
      if (yeniDurum === "Çözüldü") {
        setBanaAtananlar(prev => prev.filter(s => s.id !== sikayetId));
        setSikayetler(prev => prev.filter(s => s.id !== sikayetId));
        
        fetchCozulenler();
        fetchGunlukCozulenler();
        fetchGunlukOzet();
        
        setMesaj("Şikayet çözüldü! Bana atananlar listesinden kaldırıldı.");
      } else {
        setSikayetler(prev =>
          prev.map(s =>
            s.id === sikayetId ? { ...s, durum: yeniDurum } : s
          )
        );
        setBanaAtananlar(prev =>
          prev.map(s =>
            s.id === sikayetId ? { ...s, durum: yeniDurum } : s
          )
        );
        
        setMesaj("Şikayet durumu güncellendi!");
      }
      
      setTimeout(() => setMesaj(""), 3000);
    });

    conn.on("SikayetAtandi", (sikayetId, konu, atananKullaniciId, atayanKullaniciAdi) => {
      if (String(atananKullaniciId) === String(kullanici.id)) {
        // Sadece yeni atanan şikayetler için sayıyı artır
        // Eğer şikayet zaten listede varsa sayıyı artırma
        setBanaAtananYeniSayisi((prev) => {
          const existingComplaint = banaAtananlar.find(s => s.id === sikayetId);
          return existingComplaint ? prev : prev + 1;
        });
        
        fetchSikayetler();
        
        (async () => {
          try {
            const resp = await fetch(`${apiUrl}/api/Sikayet/bana-atananlar/${kullanici.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.ok) {
              setBanaAtananlar(await resp.json());
            }
          } catch {}
        })();
        setMesaj("Size yeni şikayet atandı!");
        setTimeout(() => setMesaj(""), 3000);
      }
    });
  }, [fetchSikayetler, fetchCozulenler, fetchGunlukCozulenler, fetchGunlukOzet, apiUrl, kullanici.id, token]);

  // SignalR eventlerini dinle
  useEffect(() => {
    if (window.signalRConnection && window.signalRConnection.state === HubConnectionState.Connected) {
      connection = window.signalRConnection;
      setupEventHandlers(connection);
    } else {
      signalRIntervalRef.current = setInterval(() => {
        if (window.signalRConnection && window.signalRConnection.state === HubConnectionState.Connected) {
          connection = window.signalRConnection;
          setupEventHandlers(connection);
          clearInterval(signalRIntervalRef.current);
        }
      }, 1000);
      
      signalRTimeoutRef.current = setTimeout(() => {
        if (signalRIntervalRef.current) {
          clearInterval(signalRIntervalRef.current);
        }
      }, 10000);
    }

    // Cleanup function
    return () => {
      if (signalRTimeoutRef.current) {
        clearTimeout(signalRTimeoutRef.current);
      }
      if (signalRIntervalRef.current) {
        clearInterval(signalRIntervalRef.current);
      }
    };
  }, [setupEventHandlers]);

  useEffect(() => {
    // İlk yükleme sadece bir kez yapılsın
    const initialLoad = async () => {
      try {
        await Promise.all([
          fetchSikayetler(),
          fetchYoneticiler(),
          fetchCozulenler(),
          fetchGunlukCozulenler(),
          fetchGunlukOzet()
        ]);
        
        // İlk açılışta bana atananları da getir
        try {
          const resp = await fetch(`${apiUrl}/api/Sikayet/bana-atananlar/${kullanici.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            setBanaAtananlar(await resp.json());
          } else {
            setBanaAtananlar([]);
          }
        } catch {
          setBanaAtananlar([]);
        }
      } catch (error) {
        console.error("İlk yükleme hatası:", error);
      }
    };

    initialLoad();

    // Periyodik yenileme sadece aktif kullanıcı için
    const refreshInterval = setInterval(() => {
      // Sadece günlük verileri periyodik olarak güncelle (5 dakikada bir)
      fetchGunlukOzet();
    }, 5 * 60 * 1000); // 5 dakika

    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchSikayetler, fetchYoneticiler, fetchCozulenler, fetchGunlukCozulenler, fetchGunlukOzet, apiUrl, kullanici.id, token]);

  useEffect(() => {
    if (drawerOpen) {
      fetchYapilanIsler();
    }
  }, [drawerOpen, fetchYapilanIsler]);

  // Şikayet atama işlemi
  const handleAtama = React.useCallback(async () => {
    setMesaj("");
    try {
      const response = await fetch(`${apiUrl}/api/Sikayet/${atamaDialog.sikayetId}/ata`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ yoneticiId: Number(yoneticiId) })
      });
      if (response.ok) {
        setMesaj("Atama başarılı!");
        setAtamaDialog({ open: false, sikayetId: null });
        fetchSikayetler();
      } else {
        setMesaj("Atama başarısız!");
      }
    } catch {
      setMesaj("Sunucuya ulaşılamıyor!");
    }
  }, [atamaDialog.sikayetId, yoneticiId, apiUrl, token, fetchSikayetler]);

  // Şikayet durum güncelleme işlemi
  const handleDurumGuncelle = React.useCallback(async () => {
    setMesaj("");
    try {
      const requestBody = { durum, cozumAciklamasi: durum === "Çözüldü" ? cozumAciklamasi : null };
      
      const response = await fetch(`${apiUrl}/api/Sikayet/${durumDialog.sikayetId}/durum`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        setDurumDialog({ open: false, sikayetId: null });
        setCozumAciklamasi("");

        if (durum === "Çözüldü") {
          setBanaAtananlar(prev => prev.filter(s => s.id !== durumDialog.sikayetId));
          setSikayetler(prev => prev.filter(s => s.id !== durumDialog.sikayetId));
          
          fetchCozulenler();
          fetchGunlukCozulenler();
          fetchGunlukOzet();
          
          setMesaj("Şikayet çözüldü! Bana atananlar listesinden kaldırıldı.");
        } else {
          setSikayetler(prev =>
            prev.map(s =>
              s.id === durumDialog.sikayetId ? { ...s, durum } : s
            )
          );
          setBanaAtananlar(prev =>
            prev.map(s =>
              s.id === durumDialog.sikayetId ? { ...s, durum } : s
            )
          );
          
          setMesaj("Şikayet durumu güncellendi!");
        }
      } else {
        setMesaj("Durum güncellenemedi!");
      }
    } catch (error) {
      setMesaj("Sunucuya ulaşılamıyor!");
    }
  }, [durum, cozumAciklamasi, durumDialog.sikayetId, apiUrl, token, fetchCozulenler, fetchGunlukCozulenler, fetchGunlukOzet]);

  // Memoized refresh function
  const refreshBanaAtananlar = React.useCallback(async () => {
    try {
      const resp = await fetch(`${apiUrl}/api/Sikayet/bana-atananlar/${kullanici.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        setBanaAtananlar(await resp.json());
        setMesaj("Bana atananlar listesi yenilendi!");
        setTimeout(() => setMesaj(""), 2000);
      }
    } catch (error) {
      setMesaj("Liste yenilenemedi!");
      setTimeout(() => setMesaj(""), 2000);
    }
  }, [apiUrl, kullanici.id, token]);

  const refreshGunlukData = React.useCallback(async () => {
    await Promise.all([
      fetchGunlukCozulenler(),
      fetchGunlukOzet()
    ]);
  }, [fetchGunlukCozulenler, fetchGunlukOzet]);

  // Yeni şikayet sayacını sıfırla
  const resetNewComplaintCounter = React.useCallback(() => {
    setBanaAtananYeniSayisi(0);
  }, []);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Sağ üstte Yapılan İşler butonu ve Bildirim Baloncuğu */}
      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", gap: 2 }}>
        {/* Bildirim Baloncuğu */}
        {(unreadDirectMessages > 0 || (pendingMessages && pendingMessages.length > 0)) && (
          <Tooltip title={`${unreadDirectMessages} okunmamış mesaj, ${pendingMessages ? pendingMessages.length : 0} bekleyen mesaj`}>
            <Badge 
              badgeContent={unreadDirectMessages + (pendingMessages ? pendingMessages.length : 0)} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '12px',
                  height: '20px',
                  minWidth: '20px',
                  borderRadius: '10px'
                }
              }}
            >
              <IconButton 
                color="primary" 
                sx={{ 
                  background: 'rgba(255, 0, 0, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 0, 0, 0.2)'
                  }
                }}
              >
                📬
              </IconButton>
            </Badge>
          </Tooltip>
        )}
        
        {/* Yapılan İşler Butonu */}
        <Tooltip title="Yapılan İşler">
          <IconButton color="primary" onClick={() => setDrawerOpen(true)}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>

        {/* Günlük Verileri Yenile Butonu */}
        <Tooltip title="Günlük Verileri Yenile">
          <IconButton 
            color="primary" 
            onClick={refreshGunlukData}
            sx={{ 
              background: 'rgba(76, 175, 80, 0.1)',
              '&:hover': {
                background: 'rgba(76, 175, 80, 0.2)'
              }
            }}
          >
            🔄
          </IconButton>
        </Tooltip>

        {/* Yeni Şikayet Sayacını Sıfırla Butonu */}
        {banaAtananYeniSayisi > 0 && (
          <Tooltip title="Yeni Şikayet Sayacını Sıfırla">
            <IconButton 
              color="secondary" 
              onClick={resetNewComplaintCounter}
              sx={{ 
                background: 'rgba(156, 39, 176, 0.1)',
                '&:hover': {
                  background: 'rgba(156, 39, 176, 0.2)'
                }
              }}
            >
              🔔
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {/* Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 350, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Yapılan İşler
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List>
            {yapilanIsler.length === 0 && (
              <ListItem>
                <ListItemText primary="Henüz işlem yok." />
              </ListItem>
            )}
            {yapilanIsler.map((log) => (
              <ListItem key={log.id} alignItems="flex-start" sx={{ mb: 1 }}>
                <ListItemText
                  primary={
                    <span>
                      <b>{log.kullaniciAdSoyad}</b> - <i>{log.islemTuru}</i>
                    </span>
                  }
                  secondary={
                    <>
                      <span>{log.aciklama}</span>
                      <br />
                      <span style={{ color: "#888", fontSize: 12 }}>
                        {new Date(log.tarih).toLocaleString()}
                      </span>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar>{kullanici.adSoyad[0]}</Avatar>
          <Typography variant="h6">
            Hoşgeldin, <b>{kullanici.adSoyad}</b>
          </Typography>
        </Box>
      </Paper>

      {/* Çözülen Sorunlar Accordion */}
      <Accordion expanded={expandedPanel === "cozulenler"} onChange={handleAccordionChange("cozulenler")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Çözülen Sorunlar</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {cozulenler.length === 0 && (
              <ListItem>
                <ListItemText primary="Çözülen şikayet yok." />
              </ListItem>
            )}
            {cozulenler.map((s) => (
              <SikayetListItem
                key={s.id}
                sikayet={s}
                onAtama={handleAtamaClick}
                onDurumGuncelle={handleDurumGuncelleClick}
                kullanici={kullanici}
              />
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Atanmamış Şikayetler Accordion */}
      <Accordion expanded={expandedPanel === "atanmamis"} onChange={handleAccordionChange("atanmamis")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">
            Atanmamış Şikayetler {atanmamislar.length > 0 && <span style={{ color: "red" }}>({atanmamislar.length} yeni)</span>}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {mesaj && <Alert severity={mesaj.includes("başarılı") || mesaj.includes("güncellendi") ? "success" : "error"} sx={{ mb: 2 }}>{mesaj}</Alert>}
          <List>
            {atanmamislar.length === 0 && (
              <ListItem>
                <ListItemText primary="Atanmamış şikayet yok." />
              </ListItem>
            )}
            {atanmamislar.map((s) => (
              <SikayetListItem
                key={s.id}
                sikayet={s}
                onAtama={handleAtamaClick}
                onDurumGuncelle={handleDurumGuncelleClick}
                kullanici={kullanici}
              />
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Bana Atananlar Accordion */}
      <Accordion expanded={expandedPanel === "banaatanan"} onChange={handleAccordionChange("banaatanan")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">
            Bana Atananlar ({banaAtananlarUi.length} aktif) 
            {banaAtananYeniSayisi > 0 && (
              <span style={{ color: "red", cursor: "pointer" }} 
                    onClick={resetNewComplaintCounter}
                    title="Sayacı sıfırlamak için tıklayın">
                ({banaAtananYeniSayisi} yeni)
              </span>
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Yenileme Butonu ve Debug Bilgisi */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              🔍 API'den {banaAtananlar.length} şikayet geldi, {banaAtananlarUi.length} aktif gösteriliyor
            </Typography>
            <Tooltip title="Listeyi Yenile">
              <IconButton
                size="small"
                onClick={refreshBanaAtananlar}
                sx={{ 
                  background: 'rgba(25, 118, 210, 0.1)',
                  '&:hover': {
                    background: 'rgba(25, 118, 210, 0.2)'
                  }
                }}
              >
                🔄
              </IconButton>
            </Tooltip>
          </Box>
          <List>
            {banaAtananlarUi.length === 0 && (
              <ListItem>
                <ListItemText 
                  primary="Size atanmış aktif şikayet yok." 
                  secondary="Tüm atanan şikayetler çözülmüş olabilir."
                />
              </ListItem>
            )}
            {banaAtananlarUi.map((s) => (
              <SikayetListItem
                key={s.id}
                sikayet={s}
                onAtama={handleAtamaClick}
                onDurumGuncelle={handleDurumGuncelleClick}
                kullanici={kullanici}
              />
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Günlük İş Takibi Accordion */}
      <Accordion expanded={expandedPanel === "gunlukTakip"} onChange={handleAccordionChange("gunlukTakip")}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h5">📊 Günlük İş Takibi</Typography>
            {gunlukOzet && (
              <Chip 
                label={`Bugün: ${gunlukOzet.toplamCozulenSikayet || 0} şikayet çözüldü`} 
                color="success" 
                size="small"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* Loading ve Error State'leri */}
          {gunlukLoading && (
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center', background: '#f5f5f5' }}>
              <Typography variant="h6" sx={{ color: '#666' }}>
                🔄 Veriler yükleniyor...
              </Typography>
            </Paper>
          )}

          {gunlukError && (
            <Paper sx={{ p: 3, mb: 3, background: '#ffebee', border: '1px solid #f44336' }}>
              <Typography variant="h6" sx={{ color: '#d32f2f', mb: 1 }}>
                ❌ Hata Oluştu
              </Typography>
              <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                {gunlukError}
              </Typography>
              <Button 
                variant="outlined" 
                color="error" 
                sx={{ mt: 2 }}
                onClick={refreshGunlukData}
              >
                🔄 Tekrar Dene
              </Button>
            </Paper>
          )}

          {/* Günlük Özet */}
          {gunlukOzet && !gunlukLoading && !gunlukError && (
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1565c0' }}>
                📈 {gunlukOzet.tarih || '18.08.2025'} Günlük Özet
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {gunlukOzet.toplamCozulenSikayet || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Toplam Çözülen
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {gunlukOzet.toplamYonetici || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Aktif Yönetici
                  </Typography>
                </Box>
              </Box>
              
                        {/* Debug Bilgileri */}
          <Box sx={{ mt: 2, p: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
              🔍 Debug: {gunlukCozulenler.length} şikayet bulundu | Özet: {gunlukOzet ? 'Mevcut' : 'Yok'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => {
                  console.log("🔍 Mevcut State'ler:");
                  console.log("gunlukCozulenler:", gunlukCozulenler);
                  console.log("gunlukCozulenler.length:", gunlukCozulenler.length);
                  if (gunlukCozulenler.length > 0) {
                    console.log("İlk şikayet örneği:", gunlukCozulenler[0]);
                  }
                  console.log("gunlukOzet:", gunlukOzet);
                  if (gunlukOzet) {
                    console.log("gunlukOzet.toplamCozulenSikayet:", gunlukOzet.toplamCozulenSikayet);
                    console.log("gunlukOzet.toplamYonetici:", gunlukOzet.toplamYonetici);
                    console.log("gunlukOzet.yoneticiDetaylari:", gunlukOzet.yoneticiDetaylari);
                  }
                  console.log("gunlukLoading:", gunlukLoading);
                  console.log("gunlukError:", gunlukError);
                  console.log("API URL:", apiUrl);
                  console.log("Token:", token ? "Mevcut" : "Yok");
                }}
              >
                📊 State'leri Göster
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={refreshGunlukData}
              >
                🔄 Verileri Yenile
              </Button>
            </Box>
          </Box>
            </Paper>
          )}

          {/* Yönetici Bazlı Detaylar */}
          {gunlukOzet?.YoneticiDetaylari?.map((yonetici, index) => (
            <Paper key={yonetici.YoneticiId} sx={{ p: 3, mb: 2, borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: index % 2 === 0 ? '#1976d2' : '#2e7d32' }}>
                    {yonetici.YoneticiAdi[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {yonetici.YoneticiAdi}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Son çözüm: {yonetici.SonCozulenSaat}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {yonetici.CozulenSikayetSayisi}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Çözülen Şikayet
                  </Typography>
                </Box>
              </Box>
              
              {/* Çözülen Şikayetler Listesi */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#666' }}>
                  Çözülen Şikayetler:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {yonetici.Sikayetler.map((sikayet) => (
                    <Chip
                      key={sikayet.Id}
                      label={`#${sikayet.Id} - ${sikayet.Konu}`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: sikayet.Oncelik === 'Yüksek' ? '#f44336' : 
                                   sikayet.Oncelik === 'Orta' ? '#ff9800' : '#4caf50',
                        color: sikayet.Oncelik === 'Yüksek' ? '#f44336' : 
                               sikayet.Oncelik === 'Orta' ? '#ff9800' : '#4caf50'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Paper>
          ))}

          {/* Günlük Çözülen Şikayetler Detay Listesi */}
          {!gunlukLoading && !gunlukError && (
            <Paper sx={{ p: 3, mt: 3, borderRadius: 3, background: '#fafafa' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}>
                📋 Bugün Çözülen Şikayetler Detayı
              </Typography>
              <List>
                {gunlukCozulenler.length === 0 ? (
                  <ListItem>
                    <Typography variant="body2" color="textSecondary">
                      Bugün henüz çözülen şikayet yok.
                    </Typography>
                  </ListItem>
                ) : (
                  gunlukCozulenler.map((sikayet) => (
                    <ListItem key={sikayet.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, mb: 1, background: 'white', flexDirection: 'column', alignItems: 'stretch' }}>
                      {/* Başlık ve Chip'ler */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          #{sikayet.id} - {sikayet.konu}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={sikayet.oncelik} 
                            size="small"
                            color={sikayet.oncelik === 'Yüksek' ? 'error' : sikayet.oncelik === 'Orta' ? 'warning' : 'success'}
                          />
                          <Chip 
                            label={sikayet.cozulmeSaat} 
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </Box>
                      </Box>
                      
                      {/* Detaylar */}
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ mb: 1 }}>
                          <strong>Müşteri:</strong> {sikayet.musteriAdi ? sikayet.musteriAdi : 'Bilinmiyor'} ({sikayet.musteriSirketi ? sikayet.musteriSirketi : 'Bilinmiyor'})
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <strong>Yönetici:</strong> {sikayet.yoneticiAdi ? sikayet.yoneticiAdi : 'Bilinmiyor'}
                        </Box>
                        {sikayet.cozumAciklamasi && (
                          <Box sx={{ fontStyle: 'italic', color: '#666' }}>
                            <strong>Çözüm:</strong> {sikayet.cozumAciklamasi}
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Atama Dialogu */}
      <Dialog open={atamaDialog.open} onClose={() => setAtamaDialog({ open: false, sikayetId: null })}>
        <DialogTitle>Yönetici Ata</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Yönetici"
            value={yoneticiId}
            onChange={e => setYoneticiId(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          >
            {kullanicilar.map(k => (
              <MenuItem key={k.id} value={k.id}>
                {k.adSoyad} ({k.kullaniciAdi})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAtamaDialog({ open: false, sikayetId: null })}>İptal</Button>
          <Button onClick={handleAtama} variant="contained">Ata</Button>
        </DialogActions>
      </Dialog>

      {/* Durum Güncelle Dialogu */}
      <Dialog open={durumDialog.open} onClose={() => setDurumDialog({ open: false, sikayetId: null })}>
        <DialogTitle>Durum Güncelle</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Durum"
            value={durum}
            onChange={e => setDurum(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          >
            <MenuItem value="Bekliyor">Bekliyor</MenuItem>
            <MenuItem value="İşleniyor">İşleniyor</MenuItem>
            <MenuItem value="Çözüldü">Çözüldü</MenuItem>
          </TextField>
          {durum === "Çözüldü" && (
            <TextField
              label="Çözüm Açıklaması"
              value={cozumAciklamasi}
              onChange={e => setCozumAciklamasi(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
              multiline
              rows={3}
              placeholder="Bu sorunu nasıl çözdüğünüzü açıklayın..."
            />
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
