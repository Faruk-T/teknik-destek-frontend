import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Typography, TextField, Button, Alert, Container, Paper,
  useTheme, InputAdornment, IconButton, Fade, Avatar, CssBaseline, Badge,
  Snackbar // YENİ EKLENDİ
} from "@mui/material";
import { Visibility, VisibilityOff, LockOutlined, Person, VpnKey } from "@mui/icons-material";
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import SupportAgentIcon from '@mui/icons-material/SupportAgent'; 
import CloseIcon from '@mui/icons-material/Close'; // YENİ EKLENDİ

import YoneticiPaneli from "./YoneticiPaneli";
import MusteriPaneli from "./MusteriPaneli";
import Register from "./Register";
import DirectChat from "./components/DirectChat";
import './App.css';

import { API_BASE_URL } from './config';

// --- ALT BİLEŞEN: LOGIN EKRANI ---
const LoginScreen = ({ onLogin, loginForm, setLoginForm, loginMesaj, onRegisterClick }) => {
  return (
    <Fade in={true} timeout={1000}>
        <Box sx={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f0f2f5", backgroundImage: "radial-gradient(#e0e0e0 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          <Container maxWidth="xs">
            <Paper elevation={24} sx={{ 
                p: 5, width: "100%", maxWidth: "450px", borderRadius: "24px", 
                background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)", 
                border: "1px solid rgba(255, 255, 255, 0.6)",
                display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <Box sx={{ textAlign: "center", mb: 4, width: '100%' }}>
                  <Avatar sx={{ m: "auto", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", width: 72, height: 72, mb: 2, boxShadow: "0 8px 24px rgba(118, 75, 162, 0.3)" }}><LockOutlined fontSize="large" /></Avatar>
                  <Typography variant="h4" fontWeight="900" sx={{ background: "linear-gradient(45deg, #333 30%, #666 90%)", backgroundClip: "text", WebkitTextFillColor: "transparent", mb: 1 }}>Hoş Geldiniz</Typography>
                  <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>Destek Paneline erişmek için giriş yapın</Typography>
              </Box>
              <form onSubmit={onLogin} style={{ width: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField 
                    fullWidth label="Kullanıcı Adı" name="kullaniciAdi" variant="outlined" 
                    value={loginForm.kullaniciAdi} 
                    onChange={(e) => setLoginForm({ ...loginForm, kullaniciAdi: e.target.value })} 
                    required 
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment>, sx: { borderRadius: "12px", bgcolor: "#f8f9fa" } }} 
                  />
                  <TextField 
                    fullWidth label="Şifre" name="sifre" type={loginForm.showPassword ? "text" : "password"} variant="outlined" 
                    value={loginForm.sifre} 
                    onChange={(e) => setLoginForm({ ...loginForm, sifre: e.target.value })} 
                    required 
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><VpnKey color="action" /></InputAdornment>, 
                      endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setLoginForm({ ...loginForm, showPassword: !loginForm.showPassword })} edge="end">{loginForm.showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>), 
                      sx: { borderRadius: "12px", bgcolor: "#f8f9fa" } 
                    }} 
                  />
                  <Button type="submit" variant="contained" fullWidth sx={{ py: 1.8, borderRadius: "12px", fontWeight: "bold", fontSize: "1.1rem", textTransform: "none", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", boxShadow: "0 8px 20px rgba(118, 75, 162, 0.3)", transition: "all 0.3s", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 25px rgba(118, 75, 162, 0.4)" } }}>Giriş Yap</Button>
                </Box>
                {loginMesaj && <Fade in={true}><Alert severity={loginMesaj.includes("başarılı") ? "success" : "error"} sx={{ mt: 3, borderRadius: 3 }}>{loginMesaj}</Alert></Fade>}
              </form>
              <Box sx={{ mt: 4, textAlign: "center", width: '100%' }}>
                  <Typography variant="body2" color="textSecondary">Hesabınız yok mu?</Typography>
                  <Button onClick={onRegisterClick} sx={{ mt: 0.5, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem', color: "#764ba2" }}>Hemen Kayıt Ol</Button>
              </Box>
            </Paper>
          </Container>
        </Box>
    </Fade>
  );
};

// --- ANA UYGULAMA BİLEŞENİ ---
function App() {
  const [ekran, setEkran] = useState("giris");
  const [loginForm, setLoginForm] = useState({ kullaniciAdi: "", sifre: "", showPassword: false });
  const [loginMesaj, setLoginMesaj] = useState("");
  const [token, setToken] = useState("");
  const [kullanici, setKullanici] = useState(null);
  
  // Chat States
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [directChatOpen, setDirectChatOpen] = useState(false);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState(0);
  const [pendingDirectMessages, setPendingDirectMessages] = useState([]);
  
  // --- YENİ EKLENDİ: Bildirim State'i ---
  const [notification, setNotification] = useState({ open: false, message: "", severity: "info" });

  const connectionRef = useRef(null);
  const processedMessages = useRef(new Set());

  // Token Kontrolü
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("kullanici");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setKullanici(JSON.parse(storedUser));
      setEkran("panel");
    }
  }, []);

  // --- YENİ EKLENDİ: Bildirim Kapatma Fonksiyonu ---
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') return;
    setNotification({ ...notification, open: false });
  };

  // Mesaj İşleme
  const processIncomingMessage = useCallback((msg) => {
    if (!msg || typeof msg !== 'object') return;
    
    // Kendi attığım mesajsa işlem yapma
    if (String(msg.senderId) === String(kullanici?.kullaniciId)) return;

    // --- YENİ EKLENDİ: Global Bildirim Göster ---
    if (!directChatOpen) {
        setNotification({
            open: true,
            message: `🔔 ${msg.senderName || 'Biri'}: Yeni bir mesajınız var, lütfen mesaj kutunuzu kontrol ediniz.`,
            severity: "info"
        });
        // İsteğe bağlı ses efekti (kısa bip sesi)
        // const audio = new Audio('/notification.mp3'); // Eğer public klasöründe ses dosyası varsa
        // audio.play().catch(e => console.log(e));
    }

    if (!msg.ticketId) handleDirectMessage(msg);
    else handleTicketMessage(msg);
  }, [kullanici, directChatOpen]);
  
  const handleDirectMessage = useCallback((msg) => {
    const messageKey = `${msg.id}-${msg.senderId}-${msg.timestamp}`;
    if (processedMessages.current.has(messageKey)) return;
    processedMessages.current.add(messageKey);
    
    if (!directChatOpen) {
        setUnreadDirectMessages(prev => prev + 1);
    }
    
    setPendingDirectMessages(prev => [...prev, { ...msg, receivedAt: new Date().toISOString() }]);
    setTimeout(() => processedMessages.current.delete(messageKey), 30000);
  }, [directChatOpen]);
  
  const handleTicketMessage = useCallback((msg) => {
    setHasNewMessage(true);
    setNewMessageData({
      senderId: msg.senderId, message: msg.content || msg.message, ticketId: msg.ticketId,
      senderName: msg.senderName, senderCompany: msg.sirketAdi, timestamp: new Date()
    });
  }, []);

  // SignalR Bağlantısı
  useEffect(() => {
    if (token && kullanici) {
      const connection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/chathub?userId=${kullanici.kullaniciId}`, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();
      connectionRef.current = connection;
      window.signalRConnection = connection;
      const startConnection = async () => {
        try {
          await connection.start();
          connection.on("ReceiveMessage", (msg) => processIncomingMessage(msg));
        } catch (err) { setTimeout(startConnection, 5000); }
      };
      startConnection();
      return () => { connection.stop(); };
    }
  }, [token, kullanici, processIncomingMessage]);

  // İşlemler
  const handleLogout = () => {
    setEkran("giris"); setToken(""); setKullanici(null); setHasNewMessage(false);
    setDirectChatOpen(false); localStorage.clear();
    if (connectionRef.current) connectionRef.current.stop();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMesaj("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/Kullanici/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (response.ok) {
        const userData = {
          id: data.kullaniciId, kullaniciId: data.kullaniciId, kullaniciAdi: data.kullaniciAdi,
          rol: data.rol, adSoyad: data.adSoyad, sirketAdi: data.sirketAdi
        };
        localStorage.setItem("token", data.token); localStorage.setItem("kullanici", JSON.stringify(userData));
        setToken(data.token); setKullanici(userData); setEkran("panel"); setHasNewMessage(false);
      } else { setLoginMesaj(data.message || "Giriş başarısız!"); }
    } catch (err) { setLoginMesaj("Sunucu hatası!"); }
  };

  // Render
  if (ekran === "kayit") return <Register onRegisterSuccess={() => setEkran("giris")} onBack={() => setEkran("giris")} />;

  if (ekran === "giris") {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        loginForm={loginForm} 
        setLoginForm={setLoginForm} 
        loginMesaj={loginMesaj}
        onRegisterClick={() => setEkran("kayit")}
      />
    );
  }

  return (
    <>
      <CssBaseline />
      {kullanici && kullanici.rol === "yonetici" && (
        <YoneticiPaneli token={token} kullanici={kullanici} onLogout={handleLogout} />
      )}
      {kullanici && kullanici.rol === "musteri" && (
        <MusteriPaneli token={token} kullaniciId={kullanici.kullaniciId} kullanici={kullanici} onLogout={handleLogout} />
      )}

      {/* Chat Bileşenleri */}
      {kullanici && token && (
        <DirectChat 
            currentUser={kullanici} 
            token={token} 
            isOpen={directChatOpen} 
            onClose={() => setDirectChatOpen(false)} 
            hasNewMessage={hasNewMessage} 
            newMessageData={newMessageData} 
            pendingMessages={pendingDirectMessages} 
        />
      )}
      
      {/* Chat Butonu */}
      {kullanici && !directChatOpen && (
         <Box sx={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
            <Button 
                onClick={() => { setDirectChatOpen(true); setUnreadDirectMessages(0); }}
                variant="contained" 
                size="large"
                sx={{ 
                    borderRadius: 30, height: 64, px: 4, fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 6px 25px rgba(118, 75, 162, 0.5)',
                    textTransform: 'none', fontWeight: '800',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.05)' }
                }}
                startIcon={
                    <Badge badgeContent={unreadDirectMessages} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 12, height: 20, minWidth: 20 } }}>
                        <SupportAgentIcon sx={{ fontSize: 32 }} />
                    </Badge>
                }
            >
                Canlı Destek
            </Button>
         </Box>
      )}

      {/* --- YENİ EKLENDİ: Global Bildirim (Snackbar) --- */}
      <Snackbar 
          open={notification.open} 
          autoHideDuration={6000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
          <Alert 
              onClose={handleCloseNotification} 
              severity={notification.severity} 
              variant="filled"
              sx={{ width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '0.95rem' }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={handleCloseNotification}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
          >
              {notification.message}
          </Alert>
      </Snackbar>
    </>
  );
}

export default App;