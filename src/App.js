import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  InputAdornment,
  IconButton,
  Tooltip,
  Badge
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import ChatIcon from '@mui/icons-material/Chat';
import YoneticiPaneli from "./YoneticiPaneli";
import MusteriPaneli from "./MusteriPaneli";
import Register from "./Register";
import DirectChat from "./components/DirectChat";
import './App.css';

// API Adresini Merkezi Tanımladık (Kolay Değişiklik İçin)
// Eski: const API_BASE_URL = "http://localhost:5106";
// YENİSİ (Bunu Yapıştır):
import { API_BASE_URL } from './config';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State Tanımları
  const [ekran, setEkran] = useState("giris");
  const [loginForm, setLoginForm] = useState({ kullaniciAdi: "", sifre: "", showPassword: false });
  const [loginMesaj, setLoginMesaj] = useState("");
  const [token, setToken] = useState("");
  const [kullanici, setKullanici] = useState(null);
  
  // SignalR ve Bildirim State'leri
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [directChatOpen, setDirectChatOpen] = useState(false);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState(0);
  const [pendingDirectMessages, setPendingDirectMessages] = useState([]);
  
  // Ref'ler
  const connectionRef = useRef(null);
  const processedMessages = useRef(new Set());

  // 💾 UYGULAMA BAŞLADIĞINDA HAFIZAYI KONTROL ET (Persistence)
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("kullanici");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setKullanici(JSON.parse(storedUser));
      setEkran("panel");
    }
  }, []);

  // Mesaj İşleme Fonksiyonu
  const processIncomingMessage = useCallback((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (String(msg.senderId) === String(kullanici?.kullaniciId)) return;
    
    if (!msg.ticketId) {
      handleDirectMessage(msg);
    } else {
      handleTicketMessage(msg);
    }
  }, [kullanici]);
  
  // Direkt Mesaj İşleme
  const handleDirectMessage = useCallback((msg) => {
    const messageKey = `${msg.id}-${msg.senderId}-${msg.timestamp}`;
    if (processedMessages.current.has(messageKey)) return;
    
    processedMessages.current.add(messageKey);
    
    if (!directChatOpen) {
      setUnreadDirectMessages(prev => prev + 1);
    }
    
    setPendingDirectMessages(prev => [...prev, { ...msg, receivedAt: new Date().toISOString() }]);
    
    setTimeout(() => {
      processedMessages.current.delete(messageKey);
    }, 30000);
  }, [directChatOpen]);
  
  // Ticket Mesajı İşleme
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

  // 🔌 SignalR Bağlantısı
  useEffect(() => {
    if (token && kullanici) {
      console.log("🔌 SignalR bağlantısı başlatılıyor...");

      const connection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/chathub?userId=${kullanici.kullaniciId}`, { // Backend'deki ChatHub URL'i
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

          // Eventleri Dinle
          connection.on("ReceiveMessage", (msg) => {
            console.log("📩 Yeni Mesaj:", msg);
            processIncomingMessage(msg);
          });

          // Diğer SignalR eventleri buraya eklenebilir...

        } catch (err) {
          console.error("❌ SignalR Bağlantı Hatası:", err);
          setTimeout(startConnection, 5000);
        }
      };

      startConnection();

      return () => {
        connection.stop();
      };
    }
  }, [token, kullanici, processIncomingMessage]);

  // 🚪 ÇIKIŞ YAPMA
  const handleLogout = () => {
    // State Temizle
    setEkran("giris");
    setToken("");
    setKullanici(null);
    setHasNewMessage(false);
    setDirectChatOpen(false);
    
    // Hafızayı Temizle (LocalStorage)
    localStorage.removeItem("token");
    localStorage.removeItem("kullanici");
    localStorage.removeItem(`unreadDirectMessages_${kullanici?.id}`);

    // SignalR Durdur
    if (connectionRef.current) {
      connectionRef.current.stop();
    }
  };

  // 🚀 GİRİŞ YAPMA (Düzeltilen Kısım)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMesaj("");
    try {
      // DİKKAT: Burası api/Kullanici/login olmalı (Auth DEĞİL)
      const response = await fetch(`${API_BASE_URL}/api/Kullanici/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        setLoginMesaj("Giriş başarılı! Yönlendiriliyorsunuz...");
        
        // Kullanıcı verisini hazırla
        const userData = {
          id: data.kullaniciId,
          kullaniciId: data.kullaniciId,
          kullaniciAdi: data.kullaniciAdi,
          rol: data.rol,
          adSoyad: data.adSoyad,
          sirketAdi: data.sirketAdi
        };

        // Hafızaya Kaydet (Persistence)
        localStorage.setItem("token", data.token);
        localStorage.setItem("kullanici", JSON.stringify(userData));

        // State Güncelle
        setToken(data.token);
        setKullanici(userData);
        setEkran("panel");
        setHasNewMessage(false);
      } else {
        setLoginMesaj(data.message || "Giriş başarısız!");
      }
    } catch (err) {
      console.error(err);
      setLoginMesaj("Sunucuya bağlanılamadı! Backend çalışıyor mu?");
    }
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        mt: isMobile ? 2 : 5, 
        px: isMobile ? 1 : 3,
        pb: isMobile ? 2 : 4
      }}
    >
      <Paper 
        elevation={isMobile ? 2 : 3} 
        sx={{ 
          p: isMobile ? 2 : 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e9ecef'
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, alignItems: "center" }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            🚀 Destek Uygulaması
          </Typography>
          
          {ekran === "panel" && (
            <Box>
              <Tooltip title="Mesajlar">
                <IconButton onClick={() => setDirectChatOpen(true)} color="primary">
                  <Badge badgeContent={unreadDirectMessages} color="error">
                    <ChatIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Button onClick={handleLogout} variant="outlined" color="error" size="small" sx={{ ml: 1 }}>
                Çıkış
              </Button>
            </Box>
          )}
        </Box>

        {ekran === "giris" && (
          <Box component="form" onSubmit={handleLogin}>
            <Typography variant="h6" align="center" gutterBottom>👤 Giriş Yap</Typography>
            
            <TextField
              fullWidth
              label="Kullanıcı Adı"
              name="kullaniciAdi"
              value={loginForm.kullaniciAdi}
              onChange={handleLoginChange}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Şifre"
              name="sifre"
              type={loginForm.showPassword ? "text" : "password"}
              value={loginForm.sifre}
              onChange={handleLoginChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setLoginForm({ ...loginForm, showPassword: !loginForm.showPassword })}>
                      {loginForm.showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
            >
              🚀 Giriş Yap
            </Button>
            
            {loginMesaj && (
              <Alert severity={loginMesaj.includes("başarılı") ? "success" : "error"}>
                {loginMesaj}
              </Alert>
            )}

            <Button onClick={() => setEkran("kayit")} fullWidth sx={{ mt: 1 }}>
              Hesabınız yok mu? Kayıt Ol
            </Button>
          </Box>
        )}

        {ekran === "kayit" && (
          <Register onRegisterSuccess={() => setEkran("giris")} onBack={() => setEkran("giris")} />
        )}

        {ekran === "panel" && kullanici && kullanici.rol === "yonetici" && (
          <YoneticiPaneli token={token} kullanici={kullanici} unreadDirectMessages={unreadDirectMessages} />
        )}

        {ekran === "panel" && kullanici && kullanici.rol === "musteri" && (
          <MusteriPaneli token={token} kullaniciId={kullanici.kullaniciId} kullanici={kullanici} />
        )}
      </Paper>

      {/* Direkt Mesajlaşma Penceresi */}
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