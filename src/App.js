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

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [ekran, setEkran] = useState("giris");
  const [loginForm, setLoginForm] = useState({ kullaniciAdi: "", sifre: "", showPassword: false });
  const [loginMesaj, setLoginMesaj] = useState("");
  const [token, setToken] = useState("");
  const [kullanici, setKullanici] = useState(null);
  
  // SignalR bağlantısı ve bildirim sistemi
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  
  // Mesajlaşma state'leri
  const [directChatOpen, setDirectChatOpen] = useState(false);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState(0);
  const [pendingDirectMessages, setPendingDirectMessages] = useState([]);
  
  // Ref'ler
  const connectionRef = useRef(null);
  const lastMessageTimestamp = useRef(null);
  const processedMessages = useRef(new Set());
  const messageQueue = useRef([]);
  
  // Mesaj işleme fonksiyonu - daha temiz ve güvenilir
  const processIncomingMessage = useCallback((msg) => {
    // Mesaj verisini kontrol et
    if (!msg || typeof msg !== 'object' || (!msg.content && !msg.message)) {
      console.log("App.js: ⚠️ Geçersiz mesaj formatı:", msg);
      return;
    }
    
    // Kendi mesajımı işleme
    if (String(msg.senderId) === String(kullanici?.kullaniciId)) {
      console.log("App.js: ℹ Kendi mesajım, işlenmiyor");
      return;
    }
    
    // Direkt mesaj mı yoksa ticket mesajı mı kontrol et
    if (!msg.ticketId) {
      // Direkt mesaj işleme
      handleDirectMessage(msg);
    } else {
      // Ticket mesajı işleme
      handleTicketMessage(msg);
    }
  }, [kullanici]);
  
  // Direkt mesaj işleme
  const handleDirectMessage = useCallback((msg) => {
    console.log("App.js: 📨 Direkt mesaj işleniyor:", {
      id: msg.id,
      senderId: msg.senderId,
      content: msg.content,
      timestamp: msg.timestamp
    });
    
    // Duplicate mesaj kontrolü
    const messageKey = `${msg.id}-${msg.senderId}-${msg.timestamp}`;
    if (processedMessages.current.has(messageKey)) {
      console.log("App.js: ⚠️ Duplicate mesaj, işlenmiyor:", messageKey);
      return;
    }
    
    // Mesajı işlenmiş olarak işaretle
    processedMessages.current.add(messageKey);
    
    // Panel kapalıysa badge'i artır
    if (!directChatOpen) {
      setUnreadDirectMessages(prev => {
        const newValue = prev + 1;
        console.log("App.js: ✅ Badge güncellendi:", prev, "→", newValue);
        return newValue;
      });
      
      // localStorage güncelle
      updateLocalStorageBadge();
    }
    
    // Bekleyen mesajlara ekle
    setPendingDirectMessages(prev => {
      const newMessage = {
        ...msg,
        receivedAt: new Date().toISOString()
      };
      const newPending = [...prev, newMessage];
      console.log("App.js: 📝 Bekleyen mesajlar güncellendi:", newPending.length);
      return newPending;
    });
    
    // 30 saniye sonra işlenmiş mesajı temizle
    setTimeout(() => {
      processedMessages.current.delete(messageKey);
    }, 30000);
  }, [directChatOpen, kullanici]);
  
  // Ticket mesajı işleme
  const handleTicketMessage = useCallback((msg) => {
    console.log("App.js: 🎫 Ticket mesajı işleniyor:", msg.ticketId);
    
    setHasNewMessage(true);
    setNewMessageData({
      senderId: msg.senderId,
      message: msg.content || msg.message,
      ticketId: msg.ticketId,
      senderName: msg.senderName,
      senderCompany: msg.senderCompany,
      timestamp: new Date()
    });
    
    // Bildirim sesi çal
    if (Notification.permission === "granted") {
      new Notification("Yeni Mesaj", {
        body: `${msg.senderName || msg.senderId}: ${msg.content || msg.message}`,
        icon: "/favicon.ico"
      });
    }
  }, []);
  
  // localStorage badge güncelleme
  const updateLocalStorageBadge = useCallback(() => {
    if (kullanici?.id) {
      const newValue = unreadDirectMessages + 1;
      localStorage.setItem(`unreadDirectMessages_${kullanici.id}`, newValue.toString());
      console.log("App.js: 💾 localStorage güncellendi:", newValue);
    }
  }, [kullanici, unreadDirectMessages]);

  // SignalR bağlantısını kur
  useEffect(() => {
    if (token && kullanici) {
      console.log("SignalR bağlantısı kuruluyor...", {
        apiUrl: process.env.REACT_APP_API_URL,
        token: token ? "Mevcut" : "Yok",
        kullanici: kullanici.kullaniciAdi
      });

      // API URL'i kontrol et
      const apiUrl = process.env.REACT_APP_API_URL || "http://192.168.1.14:5106";
      console.log("Kullanılan API URL:", apiUrl);

      // Ana SignalR bağlantısı
      const connection = new HubConnectionBuilder()
        .withUrl(`${apiUrl}/chatHub?userId=${kullanici.kullaniciId}`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      // Bağlantı referansını sakla
      connectionRef.current = connection;
      
      // Global olarak erişilebilir yap
      window.signalRConnection = connection;

      // Bağlantıyı başlat
      const startConnection = async () => {
        try {
          console.log("SignalR bağlantısı başlatılıyor...");
          await connection.start();
          console.log("Ana SignalR bağlantısı kuruldu");
          
          // Bağlantı kurulduktan sonra event handler'ları ayarla
          setupEventHandlers(connection);
        } catch (err) {
          console.error("SignalR bağlantı hatası:", err);
          console.log("5 saniye sonra tekrar deneniyor...");
          setTimeout(startConnection, 5000); // 5 saniye sonra tekrar dene
        }
      };

      // Event handler'ları ayarla
      const setupEventHandlers = (conn) => {
        console.log("Event handler'lar ayarlanıyor...");
        
        // Yeni mesaj geldiğinde bildirim göster - sadece ReceiveMessage olarak dinle
        // Mesaj işleme fonksiyonu
        function handleNewMessage(msg) {
          console.log("Ana uygulamada yeni mesaj alındı:", msg);
          processIncomingMessage(msg);
        }

        // Event handler'ları bağla
        conn.on("ReceiveMessage", handleNewMessage);
        
        // Debug: Hangi event'in geldiğini logla
        console.log("✅ SignalR event handler'ları ayarlandı: ReceiveMessage");

        // Yeni şikayet eklendiğinde bildirim göster
        conn.on("YeniSikayetEklendi", (sikayetId, konu, aciklama, kullaniciId) => {
          console.log("App.js: 🎫 Yeni şikayet eklendi:", sikayetId, konu);
          if (kullanici?.rol === "yonetici") {
            setLoginMesaj("Yeni şikayet eklendi!");
            setTimeout(() => setLoginMesaj(""), 3000);
          }
        });

        // Şikayet atandığında bildirim göster
        conn.on("SikayetAtandi", (sikayetId, konu, atananKullaniciId, atayanKullaniciAdi) => {
          console.log("App.js: 📋 Şikayet atandı:", sikayetId, konu, atananKullaniciId);
          
          // Eğer şikayet bana atandıysa bildirim göster
          if (String(atananKullaniciId) === String(kullanici?.kullaniciId)) {
            console.log("App.js: 🎯 Bana şikayet atandı!");
            setHasNewMessage(true);
            setNewMessageData({
              senderId: "system",
              message: `"${konu}" konulu şikayet size atandı`,
              ticketId: sikayetId,
              senderName: "Sistem",
              senderCompany: `${atayanKullaniciAdi} tarafından atandı`,
              timestamp: new Date(),
              isAssignment: true
            });

            // Bildirim sesi çal
            if (Notification.permission === "granted") {
              new Notification("Yeni Şikayet Atandı", {
                body: `"${konu}" konulu şikayet size atandı`,
                icon: "/favicon.ico"
              });
            }
          }
        });

        // Şikayet durumu güncellendiğinde bildirim göster
        conn.on("SikayetDurumGuncellendi", async (sikayetId, durum, cozumAciklamasi) => {
          try {
            const resp = await fetch(`${apiUrl}/api/Sikayet/${sikayetId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!resp.ok) return;
            const s = await resp.json();

            const isRelated = String(s.kullaniciId) === String(kullanici?.kullaniciId)
              || String(s.yoneticiId) === String(kullanici?.kullaniciId);
            if (!isRelated) return;

            if (Notification.permission === "granted") {
              new Notification("Şikayet Durumu Güncellendi", {
                body: `#${sikayetId} • ${durum}${cozumAciklamasi ? ` • ${cozumAciklamasi}` : ""}`,
                icon: "/favicon.ico"
              });
            }
          } catch (e) {
            console.warn("App.js: ⚠️ Durum güncelleme bildirimi alınamadı", e);
          }
        });

        console.log("✅ Event handler'lar başarıyla ayarlandı");
      };

      // Bağlantıyı başlat
      startConnection();
    } else {
      console.log("SignalR bağlantısı kurulamıyor:", { 
        hasToken: !!token, 
        hasKullanici: !!kullanici 
      });
    }

    return () => {
      if (connectionRef.current) {
        console.log("App.js: 🧹 SignalR bağlantısı kapatılıyor...");
        connectionRef.current.stop();
      }
      
      // Ref'leri temizle
      processedMessages.current.clear();
      messageQueue.current = [];
      lastMessageTimestamp.current = null;
      
      console.log("App.js: ✅ Cleanup tamamlandı");
    };
  }, [token, kullanici, processIncomingMessage, handleDirectMessage, handleTicketMessage, updateLocalStorageBadge]);

  // Bildirim izni iste
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // unreadDirectMessages değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (kullanici?.id && unreadDirectMessages >= 0) {
      localStorage.setItem(`unreadDirectMessages_${kullanici.id}`, unreadDirectMessages.toString());
      console.log("App.js: 💾 localStorage güncellendi (otomatik):", unreadDirectMessages);
    }
  }, [unreadDirectMessages, kullanici]);

  // Sayfa yüklendiğinde localStorage'dan tüm bildirim verilerini yükle
  useEffect(() => {
    if (kullanici?.id) {
      // Direkt mesaj sayısını yükle - ama sayfa yüklendiğinde sıfırla
      const storedUnreadCount = localStorage.getItem(`unreadDirectMessages_${kullanici.id}`);
      if (storedUnreadCount) {
        console.log("App.js: 🔍 localStorage'dan eski unreadDirectMessages değeri bulundu:", storedUnreadCount);
        console.log("App.js: 🧹 Sayfa yüklendiği için sıfırlanıyor...");
        // Eski değeri sıfırla
        setUnreadDirectMessages(0);
        localStorage.setItem(`unreadDirectMessages_${kullanici.id}`, "0");
      }
      
      // Yeni mesaj bildirimini yükle
      const storedHasNewMessage = localStorage.getItem(`hasNewMessage_${kullanici.id}`);
      if (storedHasNewMessage === 'true') {
        setHasNewMessage(true);
      }
      
      // Yeni mesaj verisini yükle
      const storedNewMessageData = localStorage.getItem(`newMessageData_${kullanici.id}`);
      if (storedNewMessageData) {
        try {
          const parsedData = JSON.parse(storedNewMessageData);
          setNewMessageData(parsedData);
        } catch (error) {
          console.error("App.js: ❌ Yeni mesaj verisi parse edilemedi:", error);
        }
      }
    }
  }, [kullanici]);

  // hasNewMessage değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (kullanici && kullanici.id) {
      localStorage.setItem(`hasNewMessage_${kullanici.id}`, hasNewMessage.toString());
    }
  }, [hasNewMessage, kullanici]);

  // newMessageData değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (kullanici && kullanici.id) {
      if (newMessageData) {
        localStorage.setItem(`newMessageData_${kullanici.id}`, JSON.stringify(newMessageData));
      } else {
        localStorage.removeItem(`newMessageData_${kullanici.id}`);
      }
    }
  }, [newMessageData, kullanici]);

  // Giriş formu değişiklikleri
  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  // Window üzerinden erişilebilir fonksiyonlar (YoneticiPaneli'nden çağrılabilir)
  useEffect(() => {
    if (kullanici && kullanici.id) {
      window.setHasNewMessage = setHasNewMessage;
      window.setNewMessageData = setNewMessageData;
      window.setUnreadDirectMessages = setUnreadDirectMessages;
    }
    
    return () => {
      delete window.setHasNewMessage;
      delete window.setNewMessageData;
      delete window.setUnreadDirectMessages;
    };
  }, [kullanici]);

  // Giriş formu submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMesaj("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://192.168.1.14:5106"}/api/Kullanici/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      if (response.ok) {
        const data = await response.json();
        setLoginMesaj("Giriş başarılı! Token alındı.");
        setToken(data.token);
        setKullanici({
          id: data.kullaniciId,
          kullaniciId: data.kullaniciId,
          kullaniciAdi: data.kullaniciAdi,
          rol: data.rol,
          adSoyad: data.adSoyad,
          sirketAdi: data.sirketAdi
        });
        setEkran("panel");
        // Giriş yapıldığında bildirimleri sıfırla
        setHasNewMessage(false);
        setNewMessageData(null);
      } else {
        const data = await response.json();
        setLoginMesaj(data.message || "Giriş başarısız!");
      }
    } catch (err) {
      setLoginMesaj("Sunucuya ulaşılamıyor!");
    }
  };

  // DirectChat açıldığında bildirimleri sıfırla
  useEffect(() => {
    if (directChatOpen && unreadDirectMessages > 0) {
      console.log("App.js: 🚪 DirectChat açıldı, bildirimler sıfırlanıyor...");
      console.log("App.js: 📊 Önceki unreadDirectMessages:", unreadDirectMessages);
      console.log("App.js: 📝 Bekleyen mesaj sayısı:", pendingDirectMessages.length);
      
      setUnreadDirectMessages(0);
      // localStorage'dan da sıfırla
      if (kullanici && kullanici.id) {
        localStorage.setItem(`unreadDirectMessages_${kullanici.id}`, "0");
        console.log("App.js: 💾 localStorage sıfırlandı");
      }
      console.log("App.js: ✅ Bildirimler sıfırlandı");
    }
  }, [directChatOpen, unreadDirectMessages, kullanici, pendingDirectMessages.length]);

  // DirectChat kapanırken mevcut bildirimleri koru
  const handleDirectChatClose = useCallback(() => {
    console.log("App.js: 🚪 DirectChat kapatılıyor...");
    console.log("App.js: 📊 Mevcut unreadDirectMessages:", unreadDirectMessages);
    console.log("App.js: 📝 Bekleyen mesaj sayısı:", pendingDirectMessages.length);
    
    // Panel kapanırken bekleyen mesajları unreadDirectMessages'a ekle
    if (pendingDirectMessages.length > 0) {
      console.log("App.js: 🔄 Panel kapanırken bekleyen mesajlar unreadDirectMessages'a ekleniyor...");
      
      setUnreadDirectMessages(prev => {
        const newValue = prev + pendingDirectMessages.length;
        console.log("App.js: ✅ unreadDirectMessages güncellendi:", prev, "→", newValue);
        return newValue;
      });
      
      // localStorage'ı güncelle
      if (kullanici && kullanici.id) {
        const newValue = unreadDirectMessages + pendingDirectMessages.length;
        localStorage.setItem(`unreadDirectMessages_${kullanici.id}`, newValue.toString());
        console.log("App.js: 💾 localStorage güncellendi:", newValue);
      }
    }
    
    setDirectChatOpen(false);
  }, [pendingDirectMessages.length, unreadDirectMessages, kullanici]);

  // Direkt mesaj bildirimi
  const handleDirectMessageNotification = () => {
    console.log("App.js: 🔄 Direkt mesaj bildirimi sıfırlanıyor");
    console.log("App.js: 📊 Mevcut unreadDirectMessages:", unreadDirectMessages);
    
    // Panel açıksa zaten sıfırlanmış olmalı
    if (directChatOpen) {
      console.log("App.js: ℹ Panel zaten açık, bildirimler zaten sıfırlanmış");
      return;
    }
    
    // Panel kapalıysa manuel olarak sıfırla
    if (unreadDirectMessages > 0) {
      console.log("App.js: ✅ Panel kapalı, bildirimler manuel sıfırlanıyor");
      setUnreadDirectMessages(0);
      // localStorage'dan da sıfırla
      if (kullanici && kullanici.id) {
        localStorage.setItem(`unreadDirectMessages_${kullanici.id}`, "0");
      }
    } else {
      console.log("App.js: ℹ Zaten sıfırlanmış");
    }
  };

  // Kullanıcı çıkış yaptığında bildirimleri sıfırla
  const handleLogout = () => {
    setEkran("giris");
    setToken("");
    setKullanici(null);
    setHasNewMessage(false);
    setNewMessageData(null);
    setDirectChatOpen(false);
    setUnreadDirectMessages(0);
    
    // localStorage'dan tüm bildirim verilerini temizle
    if (kullanici && kullanici.id) {
      localStorage.removeItem(`unreadDirectMessages_${kullanici.id}`);
      localStorage.removeItem(`newSikayetCount_${kullanici.id}`);
      localStorage.removeItem(`hasNewMessage_${kullanici.id}`);
      localStorage.removeItem(`newMessageData_${kullanici.id}`);
    }
    
    if (connectionRef.current) {
      connectionRef.current.stop();
    }
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
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          mb: isMobile ? 2 : 3,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            align="center" 
            sx={{ 
              flex: 1,
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: isMobile ? 'center' : 'left'
            }}
          >
            🚀 Destek Uygulaması
          </Typography>
          
          {ekran === "panel" && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {/* Direkt Mesajlaşma Butonu */}
              <Tooltip title="Direkt Mesajlaşma">
                <IconButton
                  color="primary"
                  onClick={() => setDirectChatOpen(true)}
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    }
                  }}
                >
                  <Badge 
                    badgeContent={directChatOpen ? 0 : unreadDirectMessages} 
                    color="error"
                    invisible={directChatOpen || unreadDirectMessages === 0}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '12px',
                        height: '20px',
                        minWidth: '20px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                        boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
                        animation: unreadDirectMessages > 0 ? 'whatsappPulse 2s infinite' : 'none',
                        '@keyframes whatsappPulse': {
                          '0%': { 
                            transform: 'scale(1)',
                            boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)'
                          },
                          '50%': { 
                            transform: 'scale(1.15)',
                            boxShadow: '0 4px 16px rgba(255, 68, 68, 0.6)'
                          },
                          '100%': { 
                            transform: 'scale(1)',
                            boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)'
                          }
                        }
                      }
                    }}
                    onClick={() => {
                      console.log("App.js: 🔍 Badge Debug Bilgileri:");
                      console.log("App.js: 📊 unreadDirectMessages:", unreadDirectMessages);
                      console.log("App.js: 📝 pendingDirectMessages:", pendingDirectMessages);
                      console.log("App.js: 🚪 directChatOpen:", directChatOpen);
                      console.log("App.js: 🧮 Badge Değeri:", directChatOpen ? 0 : unreadDirectMessages);
                      console.log("App.js: 💾 localStorage değeri:", kullanici && kullanici.id ? localStorage.getItem(`unreadDirectMessages_${kullanici.id}`) : "N/A");
                      console.log("App.js: 🔄 Bekleyen mesaj sayısı:", pendingDirectMessages ? pendingDirectMessages.length : 0);
                    }}
                  >
                    <ChatIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              {/* Çıkış Butonu */}
              <Button
                variant="contained"
                color="primary"
                onClick={handleLogout}
                sx={{ 
                  minWidth: "auto",
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  px: isMobile ? 2 : 3,
                  py: isMobile ? 1 : 1.5,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                🔄 Kullanıcı Değiştir
              </Button>
            </Box>
          )}
        </Box>

        {/* Yeni mesaj bildirimi */}
        {hasNewMessage && newMessageData && (
          <Alert 
            severity={newMessageData.isAssignment ? "warning" : "info"}
            sx={{ 
              mb: 2,
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: newMessageData.isAssignment 
                  ? 'rgba(255, 152, 0, 0.08)' 
                  : 'rgba(25, 118, 210, 0.08)'
              },
              border: newMessageData.isAssignment ? '1px solid #ff9800' : 'none'
            }}
            onClick={() => {
              if (newMessageData.isAssignment) {
                // Atama bildirimi ise şikayet detayını aç
                // setSelectedTicketId(newMessageData.ticketId); // Bu state artık yok
                // setShowTicketDetails(true); // Bu state artık yok
                setHasNewMessage(false);
                setNewMessageData(null);
                // Yönetici paneline geç
                setEkran("panel");
              } else {
                // Normal mesaj bildirimi ise chat'i aç
                // setSelectedTicketId(newMessageData.ticketId); // Bu state artık yok
                setHasNewMessage(false);
                setNewMessageData(null);
              }
              
              // localStorage'dan bildirim verilerini temizle
              if (kullanici && kullanici.id) {
                localStorage.removeItem(`hasNewMessage_${kullanici.id}`);
                localStorage.removeItem(`newMessageData_${kullanici.id}`);
              }
            }}
          >
            {newMessageData.isAssignment ? (
              <>
                🎯 <strong>Yeni Şikayet Atandı!</strong>
                <br />
                {newMessageData.message}
                <br />
                <small style={{ color: '#ff9800' }}>
                  {newMessageData.senderCompany} • Şikayeti görmek için tıklayın
                </small>
              </>
            ) : (
              <>
                📨 <strong>{newMessageData.senderName || newMessageData.senderId}</strong> adlı kullanıcıdan yeni mesaj: 
                "{newMessageData.message.substring(0, 50)}{newMessageData.message.length > 50 ? '...' : ''}"
                <br />
                <small>Mesajı görmek için tıklayın</small>
              </>
            )}
          </Alert>
        )}

        {ekran === "giris" && (
          <Box>
            <Box component="form" onSubmit={handleLogin}>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                gutterBottom 
                sx={{ 
                  textAlign: 'center',
                  mb: 3,
                  color: '#2c3e50',
                  fontWeight: 'bold'
                }}
              >
                👤 Kullanıcı Giriş
              </Typography>
              
              <TextField
                fullWidth
                label="Kullanıcı Adı"
                name="kullaniciAdi"
                value={loginForm.kullaniciAdi}
                onChange={handleLoginChange}
                margin="normal"
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
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
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setLoginForm({ ...loginForm, showPassword: !loginForm.showPassword })}
                        edge="end"
                      >
                        {loginForm.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
              
              <Button
                variant="contained"
                color="success"
                fullWidth
                sx={{ 
                  mt: 3,
                  mb: 2,
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  borderRadius: 2,
                  py: isMobile ? 1.5 : 2,
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(40, 167, 69, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.3s ease'
                }}
                type="submit"
              >
                🚀 Giriş Yap
              </Button>
              
              {loginMesaj && (
                <Alert
                  severity={loginMesaj.includes("başarılı") ? "success" : "error"}
                  sx={{ 
                    mt: 2,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: isMobile ? '1.2rem' : '1.5rem'
                    }
                  }}
                >
                  {loginMesaj}
                </Alert>
              )}
            </Box>
            
            <Button 
              onClick={() => setEkran("kayit")} 
              sx={{ 
                mt: 2, 
                fullWidth: true,
                color: '#667eea',
                fontWeight: 'bold',
                textDecoration: 'underline',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.04)'
                }
              }} 
              fullWidth
            >
              Hesabınız yok mu? 📝 Kayıt Ol
            </Button>
          </Box>
        )}

        {ekran === "kayit" && (
          <Register
            onRegisterSuccess={() => setEkran("giris")}
            onBack={() => setEkran("giris")}
          />
        )}

        {ekran === "panel" && kullanici && kullanici.rol === "yonetici" && (
          <YoneticiPaneli 
            token={token} 
            kullanici={kullanici} 
            // selectedTicketId={selectedTicketId} // Bu state artık yok
            // showTicketDetails={showTicketDetails} // Bu state artık yok
            // onTicketDetailsClose={() => { // Bu state artık yok
            //   setShowTicketDetails(false);
            //   setSelectedTicketId(null);
            // }}
            pendingMessages={pendingDirectMessages}
            unreadDirectMessages={unreadDirectMessages}
          />
        )}

        {ekran === "panel" && kullanici && kullanici.rol === "musteri" && (
          <MusteriPaneli 
            token={token} 
            kullaniciId={kullanici.kullaniciId} 
            kullanici={kullanici}
          />
        )}
      </Paper>
      
      {/* Direkt Mesajlaşma - sadece kullanıcı giriş yapmışsa göster */}
      {kullanici && token && (
        <DirectChat
          currentUser={kullanici}
          token={token}
          isOpen={directChatOpen}
          onClose={handleDirectChatClose}
          onNewMessage={handleDirectMessageNotification}
          hasNewMessage={hasNewMessage}
          newMessageData={newMessageData}
          pendingMessages={pendingDirectMessages}
          onPendingMessagesCleared={(clearedMessages) => {
            console.log("App.js: 🧹 Bekleyen mesajlar temizleniyor:", clearedMessages.length);
            console.log("App.js: 📝 Temizlenecek mesajlar:", clearedMessages.map(m => ({ 
              id: m.id, 
              senderId: m.senderId, 
              content: m.content,
              timestamp: m.timestamp,
              receivedAt: m.receivedAt
            })));
            
            setPendingDirectMessages(prev => {
              // Daha güvenilir filtreleme - timestamp ve receivedAt de dahil
              const filtered = prev.filter(msg => !clearedMessages.some(cleared => 
                String(cleared.id) === String(msg.id) && 
                String(cleared.senderId) === String(msg.senderId) &&
                cleared.content === msg.content &&
                cleared.timestamp === msg.timestamp &&
                cleared.receivedAt === msg.receivedAt
              ));
              
              console.log("App.js: 📊 Bekleyen mesaj sayısı güncellendi:", prev.length, "→", filtered.length);
              console.log("App.js: 📝 Kalan bekleyen mesajlar:", filtered.map(m => ({ 
                id: m.id, 
                senderId: m.senderId, 
                content: m.content,
                receivedAt: m.receivedAt
              })));
              
              return filtered;
            });
          }}
        />
      )}
    </Container>
  );
}

export default App;
