import React, { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, 
  IconButton, Chip, Avatar, CircularProgress, Tooltip
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';

import { API_BASE_URL } from '../config';
const API_URL = API_BASE_URL || "https://localhost:7196";

// Türkçe Karakter Normalizasyonu
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
        
        // Veri standartlaştırma
        const users = rawUsers.map(u => ({
            id: u.id || u.Id || u.ID,
            adSoyad: u.adSoyad || u.AdSoyad,
            kullaniciAdi: u.kullaniciAdi || u.KullaniciAdi,
            rol: u.rol || u.Rol,
            sirketAdi: u.sirketAdi || u.SirketAdi
        }));

        // Filtreleme
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

  // 3. SIGNALR
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

  if (!isOpen) return null;

  return (
    <Box sx={{ position: "fixed", bottom: 20, right: 20, width: 360, height: 550, bgcolor: "white", boxShadow: 6, borderRadius: 2, zIndex: 9999, display: 'flex', flexDirection: 'column', border: '1px solid #ccc' }}>
      
      <Box sx={{ p: 2, bgcolor: "#1976d2", color: "white", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">💬 Sohbet</Typography> 
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', gap: 1 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Kişi Seç</InputLabel>
          <Select 
            value={selectedReceiver} 
            label="Kişi Seç" 
            onChange={(e) => setSelectedReceiver(e.target.value)}
            // 🔥 KRİTİK DÜZELTME: Listenin Chat'in önüne geçmesini sağlayan kod
            MenuProps={{ sx: { zIndex: 10002 } }}
          >
            {availableUsers.length > 0 ? (
                availableUsers.map(u => (
                <MenuItem key={u.id} value={u.id}>
                    {u.adSoyad || u.kullaniciAdi} {normalizeRole(u.rol) === "yonetici" && "👑"}
                </MenuItem>
                ))
            ) : (
                <MenuItem disabled>
                    {loadingUsers ? "Yükleniyor..." : "Liste Boş"}
                </MenuItem>
            )}
          </Select>
        </FormControl>
        
        <Tooltip title="Yenile">
            <IconButton onClick={fetchUsers} color="primary" sx={{ border: '1px solid #ddd' }}>
                {loadingUsers ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#f5f5f5" }}>
        {messages.length === 0 && !selectedReceiver && (
            <Typography variant="body2" color="textSecondary" align="center" mt={10}>
                Sohbete başlamak için bir kişi seçin.
            </Typography>
        )}
        {messages.map((msg, index) => {
          const isMine = String(msg.senderId) === String(currentUser.id);
          return (
            <Box key={index} sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", mb: 1 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, maxWidth: "80%", bgcolor: isMine ? "#e3f2fd" : "white", boxShadow: 1 }}>
                <Typography variant="body2">{msg.content}</Typography>
                <Typography variant="caption" color="textSecondary" fontSize="0.7rem" display="block" textAlign="right" mt={0.5}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, display: "flex", gap: 1, borderTop: '1px solid #eee', bgcolor: 'white' }}>
        <TextField fullWidth size="small" placeholder="Mesaj..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={!selectedReceiver} />
        <Button variant="contained" onClick={sendMessage} disabled={!message || !selectedReceiver}><SendIcon /></Button>
      </Box>
    </Box>
  );
};

export default DirectChat;