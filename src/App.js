import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Typography, TextField, Button, Alert, Container, Paper,
  useTheme, useMediaQuery, InputAdornment, IconButton, Tooltip, Badge
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import ChatIcon from '@mui/icons-material/Chat';
import YoneticiPaneli from "./YoneticiPaneli";
import MusteriPaneli from "./MusteriPaneli";
import Register from "./Register";
import DirectChat from "./components/DirectChat";
import './App.css';

// API Adresi
import { API_BASE_URL } from './config';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [ekran, setEkran] = useState("giris");
  const [loginForm, setLoginForm] = useState({ kullaniciAdi: "", sifre: "", showPassword: false });
  const [loginMesaj, setLoginMesaj] = useState("");
  const [token, setToken] = useState("");
  const [kullanici, setKullanici] = useState(null);
  
  // Bildirim State'leri
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [directChatOpen, setDirectChatOpen] = useState(false);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState(0);
  const [pendingDirectMessages, setPendingDirectMessages] = useState([]);
  
  const connectionRef = useRef(null);
  const processedMessages = useRef(new Set());

  // 💾 UYGULAMA BAŞLADIĞINDA HAFIZAYI KONTROL ET
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("kullanici");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setKullanici(JSON.parse(storedUser));
      setEkran("panel");
    }
  }, []);

  // Mesaj İşleme (Bildirim Burada Tetikleniyor)
  const processIncomingMessage = useCallback((msg) => {
    if (!msg || typeof msg !== 'object') return;
    
    // Kendi mesajımsa bildirim verme
    if (String(msg.senderId) === String(kullanici?.kullaniciId)) return;
    
    if (!msg.ticketId) {
      handleDirectMessage(msg);
    } else {
      handleTicketMessage(msg);
    }
  }, [kullanici]);
  
  // Direkt Mesaj Gelince
  const handleDirectMessage = useCallback((msg) => {
    const messageKey = `${msg.id}-${msg.senderId}-${msg.timestamp}`;
    
    // Çift mesaj kontrolü
    if (processedMessages.current.has(messageKey)) return;
    processedMessages.current.add(messageKey);
    
    // 🔥 BİLDİRİM MANTIĞI: Chat kapalıysa sayıyı artır
    if (!directChatOpen) {
      console.log("🔔 Yeni mesaj geldi, chat kapalı -> Bildirim artırılıyor!");
      setUnreadDirectMessages(prev => prev + 1);
    } else {
      console.log("👀 Yeni mesaj geldi ama chat açık -> Bildirim artırılmadı.");
    }
    
    setPendingDirectMessages(prev => [...prev, { ...msg, receivedAt: new Date().toISOString() }]);
    
    // 30 saniye sonra geçmişten sil (Duplicate önlemi için)
    setTimeout(() => {
      processedMessages.current.delete(messageKey);
    }, 30000);
  }, [directChatOpen]); // directChatOpen değiştiğinde bu fonksiyon güncellenmeli
  
  const handleTicketMessage = useCallback((msg) => {
    setHasNewMessage(true);
    setNewMessageData({
      senderId: msg.senderId,
      message: msg.content || msg.message,
      ticketId: msg.ticketId,
      senderName: msg.senderName,
      senderCompany: msg.senderCompany,
      timestamp: new Date()
    });
  }, []);

  // SignalR Bağlantısı
  useEffect(() => {
    if (token && kullanici) {
      console.log("🔌 SignalR başlatılıyor...");

      const connection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/chathub?userId=${kullanici.kullaniciId}`, { 
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      connectionRef.current = connection;
      window.signalRConnection = connection;

      const startConnection = async () => {
        try {
          await connection.start();
          console.log("✅ SignalR Bağlandı!");

          connection.on("ReceiveMessage", (msg) => {
            console.log("📩 App.js Mesaj Aldı:", msg);
            processIncomingMessage(msg);
          });

        } catch (err) {
          console.error("❌ SignalR Hatası:", err);
          setTimeout(startConnection, 5000);
        }
      };

      startConnection();
      return () => { connection.stop(); };
    }
  }, [token, kullanici, processIncomingMessage]);

  const handleLogout = () => {
    setEkran("giris");
    setToken("");
    setKullanici(null);
    setHasNewMessage(false);
    setDirectChatOpen(false);
    localStorage.clear();
    if (connectionRef.current) connectionRef.current.stop();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMesaj("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/Kullanici/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (response.ok) {
        setLoginMesaj("Giriş başarılı!");
        const userData = {
          id: data.kullaniciId,
          kullaniciId: data.kullaniciId,
          kullaniciAdi: data.kullaniciAdi,
          rol: data.rol,
          adSoyad: data.adSoyad,
          sirketAdi: data.sirketAdi
        };
        localStorage.setItem("token", data.token);
        localStorage.setItem("kullanici", JSON.stringify(userData));
        setToken(data.token);
        setKullanici(userData);
        setEkran("panel");
        setHasNewMessage(false);
      } else {
        setLoginMesaj(data.message || "Giriş başarısız!");
      }
    } catch (err) { setLoginMesaj("Sunucu hatası!"); }
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleOpenChat = () => {
      setDirectChatOpen(true);
      setUnreadDirectMessages(0); // Okundu yap
  };

  return (
    <Container maxWidth="sm" sx={{ mt: isMobile ? 2 : 5, px: isMobile ? 1 : 3, pb: isMobile ? 2 : 4 }}>
      <Paper elevation={isMobile ? 2 : 3} sx={{ p: isMobile ? 2 : 4, borderRadius: 3, border: '1px solid #e9ecef' }}>
        
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, alignItems: "center" }}>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', color: '#667eea' }}>
            🚀 Destek
          </Typography>
          
          {ekran === "panel" && (
            <Box>
              <Tooltip title="Mesajlar">
                <IconButton onClick={handleOpenChat} color="primary">
                  {/* 🔥 BADGE BURADA: unreadDirectMessages > 0 ise görünür */}
                  <Badge badgeContent={unreadDirectMessages} color="error" max={99}>
                    <ChatIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Button onClick={handleLogout} variant="outlined" color="error" size="small" sx={{ ml: 1 }}>Çıkış</Button>
            </Box>
          )}
        </Box>

        {ekran === "giris" && (
          <Box component="form" onSubmit={handleLogin}>
            <Typography variant="h6" align="center" gutterBottom>👤 Giriş Yap</Typography>
            <TextField fullWidth label="Kullanıcı Adı" name="kullaniciAdi" value={loginForm.kullaniciAdi} onChange={handleLoginChange} margin="normal" required />
            <TextField fullWidth label="Şifre" name="sifre" type={loginForm.showPassword ? "text" : "password"} value={loginForm.sifre} onChange={handleLoginChange} margin="normal" required 
                InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setLoginForm({ ...loginForm, showPassword: !loginForm.showPassword })}>{loginForm.showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, mb: 2 }}>🚀 Giriş Yap</Button>
            {loginMesaj && <Alert severity={loginMesaj.includes("başarılı") ? "success" : "error"}>{loginMesaj}</Alert>}
            <Button onClick={() => setEkran("kayit")} fullWidth sx={{ mt: 1 }}>Hesabınız yok mu? Kayıt Ol</Button>
          </Box>
        )}

        {ekran === "kayit" && <Register onRegisterSuccess={() => setEkran("giris")} onBack={() => setEkran("giris")} />}

        {ekran === "panel" && kullanici && kullanici.rol === "yonetici" && (
          <YoneticiPaneli token={token} kullanici={kullanici} unreadDirectMessages={unreadDirectMessages} />
        )}

        {ekran === "panel" && kullanici && kullanici.rol === "musteri" && (
          <MusteriPaneli token={token} kullaniciId={kullanici.kullaniciId} kullanici={kullanici} />
        )}
      </Paper>

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
    </Container>
  );
}

export default App;