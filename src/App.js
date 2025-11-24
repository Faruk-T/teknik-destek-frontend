import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Typography, TextField, Button, Alert, Container, Paper,
  useTheme, useMediaQuery, InputAdornment, IconButton, Tooltip, Badge, Fade, Avatar, CssBaseline
} from "@mui/material";
import { Visibility, VisibilityOff, LockOutlined, Person, VpnKey } from "@mui/icons-material";
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

import YoneticiPaneli from "./YoneticiPaneli";
import MusteriPaneli from "./MusteriPaneli";
import Register from "./Register";
import DirectChat from "./components/DirectChat";
import './App.css';

import { API_BASE_URL } from './config';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [ekran, setEkran] = useState("giris");
  const [loginForm, setLoginForm] = useState({ kullaniciAdi: "", sifre: "", showPassword: false });
  const [loginMesaj, setLoginMesaj] = useState("");
  const [token, setToken] = useState("");
  const [kullanici, setKullanici] = useState(null);
  
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [directChatOpen, setDirectChatOpen] = useState(false);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState(0);
  const [pendingDirectMessages, setPendingDirectMessages] = useState([]);
  
  const connectionRef = useRef(null);
  const processedMessages = useRef(new Set());

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("kullanici");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setKullanici(JSON.parse(storedUser));
      setEkran("panel");
    }
  }, []);

  const processIncomingMessage = useCallback((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (String(msg.senderId) === String(kullanici?.kullaniciId)) return;
    if (!msg.ticketId) handleDirectMessage(msg);
    else handleTicketMessage(msg);
  }, [kullanici]);
  
  const handleDirectMessage = useCallback((msg) => {
    const messageKey = `${msg.id}-${msg.senderId}-${msg.timestamp}`;
    if (processedMessages.current.has(messageKey)) return;
    processedMessages.current.add(messageKey);
    if (!directChatOpen) setUnreadDirectMessages(prev => prev + 1);
    setPendingDirectMessages(prev => [...prev, { ...msg, receivedAt: new Date().toISOString() }]);
    setTimeout(() => processedMessages.current.delete(messageKey), 30000);
  }, [directChatOpen]);
  
  const handleTicketMessage = useCallback((msg) => {
    setHasNewMessage(true);
    setNewMessageData({
      senderId: msg.senderId, message: msg.content || msg.message, ticketId: msg.ticketId,
      senderName: msg.senderName, senderCompany: msg.senderCompany, timestamp: new Date()
    });
  }, []);

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
        localStorage.setItem("token", data.token);
        localStorage.setItem("kullanici", JSON.stringify(userData));
        setToken(data.token); setKullanici(userData); setEkran("panel"); setHasNewMessage(false);
      } else { setLoginMesaj(data.message || "Giriş başarısız!"); }
    } catch (err) { setLoginMesaj("Sunucu hatası!"); }
  };

  const handleLoginChange = (e) => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleOpenChat = () => { setDirectChatOpen(true); setUnreadDirectMessages(0); };

  // --- RENDER ---
  if (ekran === "kayit") return <Register onRegisterSuccess={() => setEkran("giris")} onBack={() => setEkran("giris")} />;

  // 🔥 YENİLENMİŞ GİRİŞ EKRANI (Register ile Aynı Stil)
  if (ekran === "giris") {
    return (
      <Fade in={true} timeout={800}>
        <Box sx={{ 
            width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: "#f5f5f5", backgroundImage: "radial-gradient(#e0e0e0 1px, transparent 1px)",
            backgroundSize: "20px 20px", position: "fixed", top: 0, left: 0
        }}>
          <Container maxWidth="xs">
            <Paper elevation={24} sx={{ 
                p: 4, borderRadius: "24px", background: "rgba(255, 255, 255, 0.95)", 
                backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
            }}>
              <Box sx={{ textAlign: "center", mb: 4 }}>
                  <Avatar sx={{ m: "auto", background: "linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)", width: 64, height: 64, mb: 2, boxShadow: "0 8px 24px rgba(33, 150, 243, 0.3)" }}>
                      <LockOutlined fontSize="large" />
                  </Avatar>
                  <Typography variant="h4" fontWeight="900" sx={{ background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)", backgroundClip: "text", WebkitTextFillColor: "transparent", mb: 1 }}>
                    Hoş Geldiniz
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Destek Paneline erişmek için giriş yapın</Typography>
              </Box>

              <form onSubmit={handleLogin}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField 
                    fullWidth label="Kullanıcı Adı" name="kullaniciAdi" variant="outlined"
                    value={loginForm.kullaniciAdi} onChange={handleLoginChange} required 
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment>,
                        sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                  />
                  <TextField 
                    fullWidth label="Şifre" name="sifre" type={loginForm.showPassword ? "text" : "password"} variant="outlined"
                    value={loginForm.sifre} onChange={handleLoginChange} required 
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><VpnKey color="action" /></InputAdornment>,
                        endAdornment: (
                            <InputAdornment position="end">
                            <IconButton onClick={() => setLoginForm({ ...loginForm, showPassword: !loginForm.showPassword })} edge="end">
                                {loginForm.showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            </InputAdornment>
                        ),
                        sx: { borderRadius: 3, bgcolor: "#f9fafb" } 
                    }}
                  />
                  
                  <Button 
                    type="submit" variant="contained" fullWidth 
                    sx={{ 
                        py: 1.5, borderRadius: "16px", fontWeight: "800", fontSize: "1.1rem", textTransform: "none",
                        background: "linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)", 
                        boxShadow: "0 8px 20px rgba(33, 203, 243, 0.3)",
                        transition: "all 0.3s",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 25px rgba(33, 203, 243, 0.4)" }
                    }}
                  >
                    Giriş Yap
                  </Button>
                </Box>

                {loginMesaj && <Fade in={true}><Alert severity={loginMesaj.includes("başarılı") ? "success" : "error"} sx={{ mt: 3, borderRadius: 3 }}>{loginMesaj}</Alert></Fade>}
              </form>

              <Box sx={{ mt: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary">Hesabınız yok mu?</Typography>
                  <Button onClick={() => setEkran("kayit")} sx={{ mt: 0.5, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem', color: "#2196F3" }}>
                    Hemen Kayıt Ol
                  </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Fade>
    );
  }

  // 3. PANEL EKRANI
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <CssBaseline />
      <Paper elevation={0} sx={{ p: 2, background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e0e0e0", position: "sticky", top: 0, zIndex: 1000 }}>
        <Container maxWidth="xl" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SupportAgentIcon sx={{ fontSize: 36, color: "#2196F3" }} />
              <Typography variant="h5" fontWeight="900" sx={{ background: "linear-gradient(45deg, #1565c0, #42a5f5)", backgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: '-0.5px' }}>Destek<span style={{ fontWeight: 300 }}>Pro</span></Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Mesajlar">
                <IconButton onClick={handleOpenChat} sx={{ bgcolor: '#e3f2fd', color: '#1976d2', '&:hover': { bgcolor: '#bbdefb' }, width: 48, height: 48 }}>
                  <Badge badgeContent={unreadDirectMessages} color="error" max={99}><ChatIcon /></Badge>
                </IconButton>
            </Tooltip>
            <Button onClick={handleLogout} variant="outlined" color="error" startIcon={<LogoutIcon />} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 'bold', border: '2px solid', px: 3, py: 1 }}>Çıkış</Button>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {kullanici && kullanici.rol === "yonetici" && <YoneticiPaneli token={token} kullanici={kullanici} />}
        {kullanici && kullanici.rol === "musteri" && <MusteriPaneli token={token} kullaniciId={kullanici.kullaniciId} kullanici={kullanici} />}
      </Container>

      {kullanici && token && <DirectChat currentUser={kullanici} token={token} isOpen={directChatOpen} onClose={() => setDirectChatOpen(false)} hasNewMessage={hasNewMessage} newMessageData={newMessageData} pendingMessages={pendingDirectMessages} />}
    </Box>
  );
}

export default App;