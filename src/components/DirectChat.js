import React, { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, 
  IconButton, Chip, Avatar, CircularProgress, Tooltip, Grow, Paper, Fade
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import FaceIcon from '@mui/icons-material/Face';
import CircleIcon from '@mui/icons-material/Circle';

// Config dosyasından adresi al
import { API_BASE_URL } from '../config';
const API_URL = API_BASE_URL || "https://localhost:7196";

// Rolleri standart hale getiren yardımcı fonksiyon
const normalizeRole = (role) => {
    if (!role) return "";
    return role
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .toLowerCase();
};

const DirectChat = ({ 
  currentUser, token, isOpen, onClose, onNewMessage
}) => {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const messagesEndRef = useRef(null);
  const connectionRef = useRef(null);

  // 1. KULLANICI LİSTESİNİ ÇEK
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`${API_URL}/api/Kullanici`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const rawUsers = await response.json();
        
        const users = rawUsers.map(u => ({
            id: u.id || u.Id || u.ID,
            adSoyad: u.adSoyad || u.AdSoyad,
            kullaniciAdi: u.kullaniciAdi || u.KullaniciAdi,
            rol: u.rol || u.Rol,
            sirketAdi: u.sirketAdi || u.SirketAdi || u.Sirket
        }));

        let filtered = users.filter(u => String(u.id) !== String(currentUser.id));
        const myRole = normalizeRole(currentUser.rol);
        
        if (myRole !== "yonetici") {
           filtered = filtered.filter(u => normalizeRole(u.rol) === "yonetici");
        }
        
        setAvailableUsers(filtered);
      }
    } catch (error) {
      console.error("Kullanıcı hatası:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, currentUser]);

  // 2. MESAJLARI ÇEK
  const fetchMessages = async (receiverId) => {
    if (!receiverId) return;
    try {
      const response = await fetch(`${API_URL}/api/Messages/direct/${currentUser.id}/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const rawMsgs = await response.json();
        const normalizedMsgs = rawMsgs.map(m => ({
            ...m,
            id: m.id || m.Id,
            senderId: m.senderId || m.SenderId,
            receiverId: m.receiverId || m.ReceiverId,
            content: m.content || m.Content,
            timestamp: m.timestamp || m.Timestamp
        }));
        setMessages(normalizedMsgs);
        
        await fetch(`${API_URL}/api/Messages/mark-read/${currentUser.id}/${receiverId}`, {
            method: "PUT", headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) { console.error(error); }
  };

  // 3. SIGNALR BAĞLANTISI
  useEffect(() => {
    if (token && currentUser && isOpen) {
      let conn = window.signalRConnection;
      if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
         conn = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/chathub?userId=${currentUser.id}`, { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .build();
         conn.start().then(() => setIsConnected(true)).catch(err => console.error("SignalR Hatası:", err));
      } else { setIsConnected(true); }
      setConnection(conn);
      connectionRef.current = conn;
    }
  }, [isOpen, token, currentUser]);

  // 4. MESAJ DİNLEME
  useEffect(() => {
    if (connection && isConnected) {
      const handleMessage = (rawMsg) => {
        const msg = {
            ...rawMsg,
            id: rawMsg.id || rawMsg.Id,
            senderId: rawMsg.senderId || rawMsg.SenderId,
            receiverId: rawMsg.receiverId || rawMsg.ReceiverId,
            content: rawMsg.content || rawMsg.Content,
            timestamp: rawMsg.timestamp || rawMsg.Timestamp
        };

        if (String(msg.receiverId) === String(currentUser.id) || String(msg.senderId) === String(currentUser.id)) {
            if (String(msg.senderId) === String(selectedReceiver) || String(msg.receiverId) === String(selectedReceiver)) {
                setMessages(prev => { if(prev.some(m => m.id === msg.id)) return prev; return [...prev, msg]; });
            }
        }
      };
      connection.on("ReceiveMessage", handleMessage);
      return () => { connection.off("ReceiveMessage", handleMessage); };
    }
  }, [connection, isConnected, selectedReceiver, currentUser]);

  useEffect(() => { if (isOpen) fetchUsers(); }, [isOpen, fetchUsers]);
  useEffect(() => { if (selectedReceiver) fetchMessages(selectedReceiver); }, [selectedReceiver]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!message || !selectedReceiver) return;
    try {
      await connection.invoke("SendDirectMessage", String(currentUser.id), String(selectedReceiver), message);
      const tempMsg = { id: Date.now(), senderId: currentUser.id, receiverId: selectedReceiver, content: message, timestamp: new Date().toISOString(), type: "text" };
      setMessages(prev => [...prev, tempMsg]);
      setMessage("");
    } catch (err) { console.error("Mesaj gönderilemedi:", err); }
  };

  // Kapatma Animasyonu için kontrol (isOpen false ise null dönmeden önce animasyon beklenebilir ama şimdilik basit tutalım)
  if (!isOpen) return null;

  return (
    <Grow in={isOpen} style={{ transformOrigin: 'bottom right' }}>
        <Box 
            sx={{ 
                position: "fixed", 
                bottom: 25, 
                right: 25, 
                width: 380, 
                height: 600, 
                bgcolor: "rgba(255, 255, 255, 0.95)", // Cam efekti için hafif saydamlık
                backdropFilter: "blur(10px)",
                borderRadius: "24px", 
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)", // Derin gölge
                zIndex: 9999, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.5)"
            }}
        >
        
        {/* --- HEADER (GRADYAN & MODERN) --- */}
        <Box sx={{ 
            p: 3, 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Mor-Mavi modern gradyan
            color: "white", 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "flex-start",
            boxShadow: "0 4px 15px rgba(118, 75, 162, 0.4)"
        }}>
            <Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 400, mb: 0.5 }}>
                    Merhaba, {currentUser.adSoyad?.split(' ')[0]} 👋
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '0.5px' }}>
                    Canlı Destek
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                    <CircleIcon sx={{ fontSize: 10, color: isConnected ? "#00e676" : "#ff1744" }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {isConnected ? "Bağlantı Aktif" : "Bağlanıyor..."}
                    </Typography>
                </Box>
            </Box>
            <IconButton 
                onClick={onClose} 
                sx={{ 
                    color: "white", 
                    background: "rgba(255,255,255,0.2)", 
                    backdropFilter: "blur(4px)",
                    '&:hover': { background: "rgba(255,255,255,0.3)" }
                }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Box>

        {/* --- KİŞİ SEÇİMİ (STİLİZE EDİLMİŞ) --- */}
        <Box sx={{ p: 2, bgcolor: "transparent" }}>
            <FormControl fullWidth size="small" variant="filled" hiddenLabel>
            <Select 
                value={selectedReceiver} 
                displayEmpty
                onChange={(e) => setSelectedReceiver(e.target.value)}
                MenuProps={{ 
                    sx: { zIndex: 10002 },
                    PaperProps: { sx: { borderRadius: 2, mt: 1, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" } }
                }}
                sx={{
                    borderRadius: "12px",
                    backgroundColor: "#f3f4f6",
                    border: "none",
                    '&:before': { border: 'none' },
                    '&:after': { border: 'none' },
                    '&:hover': { backgroundColor: "#e5e7eb" },
                    '& .MuiSelect-select': { py: 1.5, px: 2, display: 'flex', alignItems: 'center', gap: 1 }
                }}
                renderValue={(selected) => {
                    if (!selected) return <Typography color="text.secondary" sx={{display:'flex', alignItems:'center', gap:1}}><FaceIcon color="action"/> Görüşülecek Kişi Seçin</Typography>;
                    const user = availableUsers.find(u => u.id === selected);
                    return user ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: stringToColor(user.adSoyad) }}>
                                {user.adSoyad[0]}
                            </Avatar>
                            {user.adSoyad}
                        </Box>
                    ) : "Kişi Seç";
                }}
            >
                <MenuItem disabled value="">
                    <Typography variant="body2" color="text.secondary">
                        {loadingUsers ? "Yükleniyor..." : "Kişi Listesi"}
                    </Typography>
                </MenuItem>
                {availableUsers.map(u => (
                    <MenuItem key={u.id} value={u.id} sx={{ gap: 1.5, py: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: stringToColor(u.adSoyad) }}>
                            {u.adSoyad[0]}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight="600">{u.adSoyad}</Typography>
                            <Typography variant="caption" color="text.secondary">{u.sirketAdi || "Şirket"}</Typography>
                        </Box>
                        {normalizeRole(u.rol) === "yonetici" && <Chip label="Yönetici" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10, ml: 'auto' }} />}
                    </MenuItem>
                ))}
            </Select>
            </FormControl>
        </Box>

        {/* --- MESAJ ALANI (MODERN BALONCUKLAR) --- */}
        <Box sx={{ 
            flex: 1, 
            overflowY: "auto", 
            p: 2.5, 
            bgcolor: "#f9fafb", // Çok açık gri arka plan
            backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)", // Hafif nokta deseni
            backgroundSize: "20px 20px"
        }}>
            {messages.length === 0 && !selectedReceiver && (
                <Fade in timeout={1000}>
                    <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
                        <Box component="img" src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" sx={{ width: 80, mb: 2, filter: "grayscale(100%)" }} />
                        <Typography variant="body2">Sohbete başlamak için yukarıdan bir kişi seçin.</Typography>
                    </Box>
                </Fade>
            )}

            {messages.map((msg, index) => {
            const isMine = String(msg.senderId) === String(currentUser.id);
            return (
                <Box key={index} sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", mb: 2 }}>
                    {!isMine && (
                        <Avatar sx={{ width: 28, height: 28, mr: 1, mt: 0.5, bgcolor: stringToColor(msg.senderName || "?") }}>
                            {(msg.senderName || "?")[0]}
                        </Avatar>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: "75%" }}>
                        <Paper elevation={0} sx={{ 
                            p: "12px 16px", 
                            borderRadius: isMine ? "20px 20px 4px 20px" : "20px 20px 20px 4px", 
                            bgcolor: isMine ? "#667eea" : "#ffffff", 
                            color: isMine ? "#fff" : "#1f2937",
                            boxShadow: isMine ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
                            border: isMine ? "none" : "1px solid #f3f4f6",
                            wordWrap: "break-word"
                        }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{msg.content}</Typography>
                        </Paper>
                        <Typography variant="caption" sx={{ color: "#9ca3af", mt: 0.5, fontSize: "0.7rem", px: 1 }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Typography>
                    </Box>
                </Box>
            );
            })}
            <div ref={messagesEndRef} />
        </Box>

        {/* --- INPUT ALANI (KAPSÜL TASARIM) --- */}
        <Box sx={{ p: 2, bgcolor: "white", borderTop: '1px solid #f3f4f6' }}>
            <Box sx={{ 
                display: "flex", 
                gap: 1, 
                bgcolor: "#f3f4f6", 
                borderRadius: "30px", 
                p: "6px 6px 6px 20px",
                alignItems: 'center'
            }}>
                <TextField 
                    fullWidth 
                    variant="standard" 
                    placeholder="Bir mesaj yazın..." 
                    InputProps={{ disableUnderline: true }}
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                    disabled={!selectedReceiver} 
                />
                <IconButton 
                    onClick={sendMessage} 
                    disabled={!message || !selectedReceiver}
                    sx={{ 
                        bgcolor: !message ? "#e5e7eb" : "#764ba2", 
                        color: "white",
                        width: 40,
                        height: 40,
                        transition: "all 0.2s",
                        '&:hover': { bgcolor: "#667eea", transform: "scale(1.05)" },
                        '&.Mui-disabled': { color: "#9ca3af" }
                    }}
                >
                    <SendIcon fontSize="small" />
                </IconButton>
            </Box>
        </Box>
        </Box>
    </Grow>
  );
};

// Avatar için rastgele renk üreteci
function stringToColor(string) {
    if (!string) return "#999";
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

export default DirectChat;