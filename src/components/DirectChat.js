import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, 
  IconButton, Chip, Avatar, Dialog, DialogContent
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

// ✅ DÜZELTME: Backend Adresi Güncellendi
import { API_BASE_URL as API_URL } from '../config';

const DirectChat = ({ 
  currentUser, token, isOpen, onClose, onNewMessage
}) => {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const messagesEndRef = useRef(null);
  const connectionRef = useRef(null);

  // 1. KULLANICI LİSTESİNİ ÇEK
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/Kullanici`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const users = await response.json();
        
        // Kendini listeden çıkar
        let filtered = users.filter(u => String(u.id) !== String(currentUser.id));
        
        // Müşteriysen SADECE Yöneticileri gör
        if (currentUser.rol !== "yonetici") {
           filtered = filtered.filter(u => u.rol === "yonetici");
        }
        
        setAvailableUsers(filtered);
      }
    } catch (error) {
      console.error("Kullanıcılar alınamadı:", error);
    }
  };

  // 2. MESAJLARI ÇEK
  const fetchMessages = async (receiverId) => {
    if (!receiverId) return;
    try {
      const response = await fetch(`${API_URL}/api/Messages/direct/${currentUser.id}/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setMessages(await response.json());
        // Okundu olarak işaretle
        await fetch(`${API_URL}/api/Messages/mark-read/${currentUser.id}/${receiverId}`, {
            method: "PUT", headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) { console.error(error); }
  };

  // 3. SIGNALR BAĞLANTISI
  useEffect(() => {
    if (token && currentUser && isOpen) {
      // Varsa global bağlantıyı kullan, yoksa yeni aç
      let conn = window.signalRConnection;
      
      if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
         conn = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/chathub?userId=${currentUser.id}`, { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .build();
         
         conn.start()
             .then(() => setIsConnected(true))
             .catch(err => console.error("SignalR Hatası:", err));
      } else {
         setIsConnected(true);
      }

      setConnection(conn);
      connectionRef.current = conn;
    }
  }, [isOpen]);

  // 4. MESAJ DİNLEME
  useEffect(() => {
    if (connection && isConnected) {
      const handleMessage = (msg) => {
        // Mesaj bana mı?
        if (String(msg.receiverId) === String(currentUser.id) || String(msg.senderId) === String(currentUser.id)) {
            // Şu an açık olan kişiyle mi konuşuyorum?
            if (String(msg.senderId) === String(selectedReceiver) || String(msg.receiverId) === String(selectedReceiver)) {
                setMessages(prev => [...prev, msg]);
            }
        }
      };

      connection.on("ReceiveMessage", handleMessage);
      return () => { connection.off("ReceiveMessage", handleMessage); };
    }
  }, [connection, isConnected, selectedReceiver]);

  // Açılışta kullanıcıları getir
  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  // Kişi seçince mesajları getir
  useEffect(() => {
    if (selectedReceiver) fetchMessages(selectedReceiver);
  }, [selectedReceiver]);

  // Otomatik aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message || !selectedReceiver) return;
    try {
      await connection.invoke("SendDirectMessage", String(currentUser.id), String(selectedReceiver), message);
      setMessage("");
    } catch (err) { console.error("Mesaj gönderilemedi:", err); }
  };

  if (!isOpen) return null;

  return (
    <Box sx={{ position: "fixed", bottom: 20, right: 20, width: 360, height: 500, bgcolor: "white", boxShadow: 6, borderRadius: 2, zIndex: 9999, display: 'flex', flexDirection: 'column', border: '1px solid #ccc' }}>
      {/* Başlık */}
      <Box sx={{ p: 2, bgcolor: "#1976d2", color: "white", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">💬 Sohbet</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </Box>

      {/* Kullanıcı Seçimi */}
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Kişi Seç</InputLabel>
          <Select value={selectedReceiver} label="Kişi Seç" onChange={(e) => setSelectedReceiver(e.target.value)}>
            {availableUsers.map(u => (
              <MenuItem key={u.id} value={u.id}>
                {u.adSoyad || u.kullaniciAdi} {u.rol === "yonetici" && "👑"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Mesaj Alanı */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#f5f5f5" }}>
        {messages.map((msg, index) => {
          const isMine = String(msg.senderId) === String(currentUser.id);
          return (
            <Box key={index} sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", mb: 1 }}>
              <Box sx={{ p: 1, borderRadius: 2, maxWidth: "80%", bgcolor: isMine ? "#e3f2fd" : "white", boxShadow: 1 }}>
                <Typography variant="body2">{msg.content}</Typography>
                <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 1, display: "flex", gap: 1, borderTop: '1px solid #eee' }}>
        <TextField fullWidth size="small" placeholder="Mesaj..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
        <Button variant="contained" onClick={sendMessage} disabled={!selectedReceiver}><SendIcon /></Button>
      </Box>
    </Box>
  );
};

export default DirectChat;