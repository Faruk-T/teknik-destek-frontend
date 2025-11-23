import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Paper,
  Avatar,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const API_URL = process.env.REACT_APP_API_URL || "http://192.168.1.14:5106";

const DirectChat = ({ 
  currentUser, 
  token, 
  isOpen, 
  onClose, 
  onNewMessage,
  hasNewMessage,
  newMessageData,
  pendingMessages: externalPendingMessages = [],
  onPendingMessagesCleared
}) => {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [pendingMessages, setPendingMessages] = useState([]); // Bekleyen mesajlar
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageForView, setSelectedImageForView] = useState(null);
  const [isImageViewDialogOpen, setIsImageViewDialogOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef(null);
  const connectionRef = useRef(null);
  const selectedReceiverRef = useRef(""); // Güncel selectedReceiver değerini takip et
  const fileInputRef = useRef(null);

  // Kullanıcı listesini çek
  const fetchUsers = async () => {
    try {
      console.log("DirectChat: fetchUsers çağrıldı, currentUser:", currentUser);
      
      const response = await fetch(`${API_URL}/api/Kullanici`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const users = await response.json();
        console.log("DirectChat: API'den gelen tüm kullanıcılar:", users.length);
        console.log("DirectChat: Tüm kullanıcılar:", users.map(u => ({ id: u.id, adSoyad: u.adSoyad, rol: u.rol, aktif: u.aktif })));
        
        // Kendisi hariç diğer kullanıcıları filtrele
        let filteredUsers = users.filter(u => u.id !== currentUser.id);
        console.log("DirectChat: Kendisi hariç kullanıcılar:", filteredUsers.length);
        
        // Kullanıcı rolüne göre filtreleme yap
        console.log("DirectChat: 🔍 Rol kontrolü başlıyor...");
        console.log("DirectChat: currentUser.rol:", currentUser.rol);
        console.log("DirectChat: currentUser.rol === 'yonetici':", currentUser.rol === "yonetici");
        console.log("DirectChat: currentUser.rol === 'müşteri':", currentUser.rol === "müşteri");
        console.log("DirectChat: currentUser.rol === 'musteri':", currentUser.rol === "musteri");
        console.log("DirectChat: Müşteri rolü tespit edildi mi:", currentUser.rol === "müşteri" || currentUser.rol === "musteri");
        
        if (currentUser.rol === "yonetici") {
          console.log("DirectChat: 🎯 Yönetici rolü tespit edildi!");
          // Yöneticiler hem yöneticiler hem müşterilerle konuşabilir
          // Sadece aktif kullanıcıları göster
          filteredUsers = filteredUsers.filter(u => u.aktif !== false);
          console.log("DirectChat: Yönetici olarak tüm aktif kullanıcılar gösteriliyor:", filteredUsers.length);
          console.log("DirectChat: Gösterilen kullanıcılar:", filteredUsers.map(u => ({ id: u.id, adSoyad: u.adSoyad, rol: u.rol })));
        } else if (currentUser.rol === "müşteri" || currentUser.rol === "musteri") {
          console.log("DirectChat: 🎯 Müşteri rolü tespit edildi!");
          // Müşteriler SADECE yöneticilerle konuşabilir - diğer müşterileri hiç görmesin
          const beforeFilter = filteredUsers.length;
          console.log("DirectChat: Müşteri filtreleme başlıyor - Önce:", beforeFilter);
          console.log("DirectChat: Filtreleme öncesi kullanıcılar:", filteredUsers.map(u => ({ id: u.id, adSoyad: u.adSoyad, rol: u.rol, aktif: u.aktif })));
          
          filteredUsers = filteredUsers.filter(u => u.rol === "yonetici" && u.aktif !== false);
          console.log("DirectChat: Müşteri filtreleme - Önce:", beforeFilter, "Sonra:", filteredUsers.length);
          console.log("DirectChat: Müşteri olarak sadece yöneticiler gösteriliyor:", filteredUsers.length);
          console.log("DirectChat: Gösterilen yöneticiler:", filteredUsers.map(u => ({ id: u.id, adSoyad: u.adSoyad, rol: u.rol })));
          
          // Debug: Filtrelenen kullanıcıları da göster
          const filteredOut = users.filter(u => u.id !== currentUser.id && u.aktif !== false && u.rol !== "yonetici");
          console.log("DirectChat: Filtrelenen müşteriler:", filteredOut.map(u => ({ id: u.id, adSoyad: u.adSoyad, rol: u.rol })));
        } else {
          console.log("DirectChat: ⚠️ Bilinmeyen rol tespit edildi:", currentUser.rol);
          console.log("DirectChat: currentUser tam detayı:", currentUser);
        }
        
        console.log("DirectChat: Final filteredUsers:", filteredUsers.length);
        setAvailableUsers(filteredUsers);
      }
    } catch (error) {
      console.error("Kullanıcı listesi alınamadı:", error);
    }
  };

  // Seçili kullanıcı ile olan mesajları çek
  const fetchMessages = async (receiverId) => {
    if (!receiverId) return;
    
    try {
      console.log("DirectChat: Mesajlar çekiliyor, receiverId:", receiverId);
      const response = await fetch(`${API_URL}/api/Messages/direct/${currentUser.id}/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log("DirectChat: Çekilen mesajlar:", data);
        
        // Backend'den gelen mesajlarda senderName eksikse ekle
        const enrichedMessages = data.map(msg => {
          if (!msg.senderName && msg.senderId) {
            const senderUser = availableUsers.find(u => String(u.id) === String(msg.senderId));
            if (senderUser) {
              msg.senderName = senderUser.adSoyad || senderUser.kullaniciAdi || `Kullanıcı ${msg.senderId}`;
              console.log("DirectChat: ✅ senderName eklendi:", msg.senderName);
            } else {
              msg.senderName = `Kullanıcı ${msg.senderId}`;
              console.log("DirectChat: ⚠️ Kullanıcı bulunamadı, varsayılan ad kullanılıyor");
            }
          }
          
          // Mesaj tipini belirle
          if (!msg.type) {
            if (msg.content && (
              msg.content.startsWith('data:image') || 
              msg.content.includes('base64') ||
              msg.content.includes('image') ||
              (msg.content.includes('http') && (
                msg.content.includes('.jpg') || 
                msg.content.includes('.jpeg') || 
                msg.content.includes('.png') || 
                msg.content.includes('.gif')
              ))
            )) {
              msg.type = "image";
              console.log("DirectChat: 🖼️ Resim mesajı tespit edildi:", {
                id: msg.id,
                content: msg.content ? msg.content.substring(0, 50) + "..." : null,
                type: msg.type
              });
            } else {
              msg.type = "text";
            }
          }
          
          return msg;
        });
        
        console.log("DirectChat: Zenginleştirilmiş mesajlar:", enrichedMessages);
        setMessages(enrichedMessages);
        
        // Mesajları okundu olarak işaretle
        markMessagesAsRead(receiverId);
      }
    } catch (error) {
      console.error("Mesajlar alınamadı:", error);
    }
  };

  // Mesajları okundu olarak işaretle
  const markMessagesAsRead = async (receiverId) => {
    try {
      await fetch(`${API_URL}/api/Messages/mark-read/${currentUser.id}/${receiverId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      // Okunmamış sayıları güncelle
      fetchUnreadCounts();
    } catch (error) {
      console.error("Mesajlar okundu olarak işaretlenemedi:", error);
    }
  };

  // Okunmamış mesaj sayılarını çek
  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/Messages/unread-counts/${currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCounts(data);
      }
    } catch (error) {
      console.error("Okunmamış mesaj sayıları alınamadı:", error);
    }
  };

  // Ana uygulamadaki SignalR bağlantısını kullan - yeni bağlantı kurma
  useEffect(() => {
    if (token && currentUser && isOpen) {
      console.log("DirectChat: Ana uygulamadaki SignalR bağlantısı aranıyor...");
      
      // Global SignalR bağlantısını bul
      const globalConnection = window.signalRConnection;
      
      if (globalConnection && globalConnection.state === signalR.HubConnectionState.Connected) {
        console.log("DirectChat: ✅ Global SignalR bağlantısı bulundu ve kullanılıyor");
        connectionRef.current = globalConnection;
        setConnection(globalConnection);
        setIsConnected(true);
      } else {
        console.log("DirectChat: ⚠️ Global bağlantı bulunamadı, yeni bağlantı kuruluyor...");
        
        // Yeni bağlantı oluştur
        if (!connectionRef.current) {
          const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/chatHub?userId=${currentUser.id}`, {
              accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .build();

          connectionRef.current = newConnection;
          setConnection(newConnection);

          // Bağlantıyı kur
          const startConnection = async () => {
            try {
              console.log("DirectChat: SignalR bağlantısı başlatılıyor...");
              await newConnection.start();
              console.log("DirectChat: ✅ SignalR bağlantısı başarıyla kuruldu!");
              setIsConnected(true);
            } catch (err) {
              console.error("DirectChat: ❌ SignalR bağlantısı kurulamadı:", err);
              setIsConnected(false);
            }
          };

          startConnection();
        }
      }
    }
  }, [token, currentUser, isOpen]);

    // SignalR eventlerini dinle
  useEffect(() => {
    if (connection && isConnected) {
      console.log("DirectChat: Event handler kuruluyor, selectedReceiver:", selectedReceiver);
      
      // Önce eski handler'ları temizle
      connection.off("ReceiveMessage");
      
      // Yeni mesaj geldiğinde dinle - hem ReceiveMessage hem de receivemessage olarak
      const handleNewMessage = (msg) => {
        console.log("DirectChat: Yeni mesaj alındı:", msg);
        console.log("DirectChat: Şu anki selectedReceiver:", selectedReceiver);
        
        // Backend'den gelen mesajda senderName eksikse ekle
        if (!msg.senderName && msg.senderId) {
          const senderUser = availableUsers.find(u => String(u.id) === String(msg.senderId));
          if (senderUser) {
            msg.senderName = senderUser.adSoyad || senderUser.kullaniciAdi || `Kullanıcı ${msg.senderId}`;
            console.log("DirectChat: ✅ senderName eklendi:", msg.senderName);
          } else {
            msg.senderName = `Kullanıcı ${msg.senderId}`;
            console.log("DirectChat: ⚠️ Kullanıcı bulunamadı, varsayılan ad kullanılıyor");
          }
        }
        
        // Mesaj tipini belirle
        if (!msg.type) {
          if (msg.content && (
            msg.content.startsWith('data:image') || 
            msg.content.includes('base64') ||
            msg.content.includes('image') ||
            (msg.content.includes('http') && (
              msg.content.includes('.jpg') || 
              msg.content.includes('.jpeg') || 
              msg.content.includes('.png') || 
              msg.content.includes('.gif')
            ))
          )) {
            msg.type = "image";
            console.log("DirectChat: 🖼️ Resim mesajı tespit edildi:", {
              id: msg.id,
              content: msg.content ? msg.content.substring(0, 50) + "..." : null,
              type: msg.type
            });
          } else {
            msg.type = "text";
          }
        }
        
        // Eğer mesaj başka bir kullanıcıdan geldiyse
        if (String(msg.senderId) !== String(currentUser.id)) {
          console.log("DirectChat: Başka kullanıcıdan mesaj geldi, işleniyor...");
          
          // Mesaj bana geldi mi kontrol et
          if (String(msg.receiverId) === String(currentUser.id)) {
            console.log("DirectChat: Mesaj bana geldi, işleniyor...");
            console.log("DirectChat: Mesaj gönderen:", msg.senderId);
            console.log("DirectChat: Şu anki selectedReceiver:", selectedReceiver);
            
            if (String(msg.senderId) === String(selectedReceiver)) {
              // Şu anda o kullanıcı ile sohbet ediyorum - ANINDA EKLE
              console.log("DirectChat: ✅ ANINDA EKLENİYOR - Şu anda o kullanıcı ile sohbet ediyorum");
              setMessages(prev => {
                // Aynı mesaj zaten var mı kontrol et (ÇOK DAHA SIKI KONTROL)
                const messageExists = prev.some(m => 
                  m.id === msg.id || 
                  (m.content === msg.content && 
                   m.senderId === msg.senderId && 
                   m.receiverId === msg.receiverId &&
                   Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 5000)
                );
                
                if (messageExists) {
                  console.log("DirectChat: ❌ Mesaj zaten mevcut, eklenmedi - ÇİFT MESAJ ENGELLENDİ!");
                  return prev;
                }
                
                console.log("DirectChat: 🎉 YENİ MESAJ ANINDA EKLENDİ! Toplam:", prev.length + 1);
                return [...prev, msg];
              });
            } else {
              // Farklı kullanıcıdan mesaj geldi - bekleyen listesine ekle
              console.log("DirectChat: ⏳ Bekleyen listesine ekleniyor - Farklı kullanıcı ile sohbet ediyorum");
              setPendingMessages(prev => [...prev, msg]);
              
              // Eğer mesaj kutusu kapalıysa, mesajları backend'den çekmeye hazırla
              if (!isOpen) {
                console.log("DirectChat: 📝 Mesaj kutusu kapalı, mesajlar bekleyen listesinde saklanıyor");
              }
            }
          } else {
            console.log("DirectChat: ❌ Mesaj bana gelmedi, işlenmiyor");
          }
          
          // Okunmamış mesaj sayısını güncelle
          fetchUnreadCounts();
          
          // Ana uygulamaya bildirim gönder
          if (onNewMessage) {
            onNewMessage();
          }
        } else {
          console.log("DirectChat: Kendi mesajım geldi, işleniyor...");
          
          // Kendi mesajım geldi - local mesajı gerçek mesajla değiştir
          if (String(msg.receiverId) === String(selectedReceiver)) {
            console.log("DirectChat: 🔄 Kendi mesajım geldi, local mesaj güncelleniyor...");
            setMessages(prev => {
              // Local mesajı bul (aynı content ve timestamp ile)
              const localMessageIndex = prev.findIndex(m => 
                m.content === msg.content && 
                String(m.senderId) === String(msg.senderId) &&
                String(m.receiverId) === String(msg.receiverId) &&
                Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 5000
              );
              
              if (localMessageIndex !== -1) {
                console.log("DirectChat: ✅ Local mesaj bulundu, gerçek ID ile güncelleniyor");
                const newMessages = [...prev];
                newMessages[localMessageIndex] = msg; // Gerçek mesaj ile değiştir
                return newMessages;
              }
              
              // Local mesaj bulunamadıysa direkt ekle
              console.log("DirectChat: ⚠️ Local mesaj bulunamadı, direkt ekleniyor");
              return [...prev, msg];
            });
          }
        }
      };
      
      connection.on("ReceiveMessage", handleNewMessage);
      connection.on("receivemessage", handleNewMessage);
      
      // Mesaj silindi event'ini dinle
      connection.off("MessageDeleted");
      connection.on("MessageDeleted", (messageId) => {
        console.log("DirectChat: 🗑️ Mesaj silindi event'i alındı:", messageId);
        
        // Hemen local state'i güncelle
        setMessages(prev => {
          const newMessages = prev.filter(m => m.id !== messageId);
          console.log(`DirectChat: ✅ Mesaj ${messageId} local state'den silindi. Önceki: ${prev.length}, Yeni: ${newMessages.length}`);
          return newMessages;
        });
        
        // Mesaj silindikten sonra ekranı en alta götürme
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      });
      
      console.log("✅ DirectChat SignalR event handler'ları ayarlandı: ReceiveMessage, receivemessage, MessageDeleted");
      
      // Diğer event handler'ları da ekle
      connection.off("SikayetAtandi");
      connection.on("SikayetAtandi", (data) => {
        console.log("DirectChat: Şikayet atandı event'i alındı:", data);
      });
      
      connection.off("SikayetDurumGuncellendi");
      connection.on("SikayetDurumGuncellendi", (data) => {
        console.log("DirectChat: Şikayet durum güncellendi event'i alındı:", data);
      });
    }

    return () => {
      if (connection) {
        connection.off("ReceiveMessage");
        connection.off("receivemessage");
        connection.off("MessageDeleted");
        connection.off("SikayetAtandi");
        connection.off("SikayetDurumGuncellendi");
      }
    };
  }, [connection, isConnected, currentUser.id, selectedReceiver, onNewMessage]);

  // İlk açılışta ve kullanıcı değiştiğinde kullanıcıları ve okunmamış sayıları çek
  useEffect(() => {
    if (isOpen && currentUser) {
      console.log("DirectChat: Kullanıcı listesi güncelleniyor, currentUser:", currentUser);
      fetchUsers();
      fetchUnreadCounts();
    }
  }, [isOpen, currentUser]);

  // Seçili kullanıcı değiştiğinde mesajları çek ve ref'i güncelle
  useEffect(() => {
    if (selectedReceiver) {
      selectedReceiverRef.current = selectedReceiver; // Ref'i güncelle
      fetchMessages(selectedReceiver);
      
      // Bekleyen mesajları kontrol et ve ekle
      checkAndAddPendingMessages(selectedReceiver);
    }
  }, [selectedReceiver]);

  // Otomatik aşağı kaydırma - sadece yeni mesaj geldiğinde
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Sadece son mesaj yeni eklenmişse aşağı kaydır
      const lastMessage = messages[messages.length - 1];
      const isNewMessage = lastMessage && 
        (Date.now() - new Date(lastMessage.timestamp).getTime()) < 5000; // 5 saniye içinde
      
      if (isNewMessage) {
        console.log("DirectChat: 📜 Yeni mesaj geldi, ekran en alta kaydırılıyor...");
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length]); // Sadece mesaj sayısı değiştiğinde

  // Mesaj gönder
  const sendMessage = async () => {
    if (!isConnected) {
      alert("❌ Henüz bağlantı kurulamadı! Lütfen bekleyin...");
      return;
    }
    
    if (!connection) {
      alert("❌ Bağlantı bulunamadı! Lütfen sayfayı yenileyin...");
      return;
    }
    
    if (!message || !selectedReceiver) {
      alert("❌ Lütfen mesaj yazın ve kullanıcı seçin!");
      return;
    }
    
    if (connection && isConnected && message && selectedReceiver) {
      // Önce mesajı local olarak ekle (anlık görünüm için)
      const tempMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique geçici ID
        senderId: String(currentUser.id),
        senderName: currentUser.adSoyad || currentUser.kullaniciAdi || `Kullanıcı ${currentUser.id}`,
        senderCompany: currentUser.sirketAdi || "",
        receiverId: String(selectedReceiver),
        content: message,
        timestamp: new Date().toISOString(),
        isRead: false
      };

      try {
        console.log("DirectChat: Mesaj gönderiliyor:", {
          senderId: currentUser.id,
          receiverId: selectedReceiver,
          message: message
        });

        console.log("DirectChat: Local mesaj ekleniyor:", tempMessage);
        
        // Çift mesaj kontrolü - aynı mesaj zaten var mı?
        setMessages(prev => {
          const messageExists = prev.some(m => 
            m.content === message && 
            String(m.senderId) === String(currentUser.id) &&
            String(m.receiverId) === String(selectedReceiver) &&
            Math.abs(new Date(m.timestamp) - new Date()) < 3000
          );
          
          if (messageExists) {
            console.log("DirectChat: ❌ Aynı mesaj zaten var, eklenmedi!");
            return prev;
          }
          
          return [...prev, tempMessage];
        });
        
        setMessage("");

        // Sonra backend'e gönder
        console.log("DirectChat: Backend'e mesaj gönderiliyor...");
        await connection.invoke(
          "SendDirectMessage",
          String(currentUser.id),
          String(selectedReceiver),
          message
        );
        
        console.log("DirectChat: Mesaj başarıyla gönderildi");
        
        // Local mesajı gerçek mesajla değiştir (backend'den gelen)
        // Bu işlem ReceiveMessage event'inde otomatik olarak yapılacak
        
      } catch (err) {
        console.error("Mesaj gönderme hatası:", err);
        // Hata durumunda mesajı geri al
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        setMessage(message); // Mesajı geri koy
      }
    }
  };

  // Mesaj sil
  const deleteMessage = async (msgId) => {
    try {
      console.log("DirectChat: 🗑️ Mesaj siliniyor:", msgId);
      
      // 1. HTTP API ile mesajı sil
      const response = await fetch(`${API_URL}/api/Messages/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log("DirectChat: ✅ HTTP API ile mesaj silindi");
        
        // 2. SignalR ile diğer kullanıcıya mesaj silindi bilgisini gönder
        if (connection && isConnected) {
          try {
            await connection.invoke(
              "DeleteMessage",
              msgId,
              String(currentUser.id),
              String(selectedReceiver)
            );
            console.log("DirectChat: ✅ SignalR ile mesaj silindi bilgisi gönderildi");
          } catch (signalRError) {
            console.log("DirectChat: ⚠️ SignalR hatası:", signalRError.message);
            console.log("DirectChat: 🔄 Alternatif yöntem: Mesajlar yeniden çekiliyor...");
            
            // SignalR çalışmıyorsa, mesajları yeniden çek
            setTimeout(() => {
              fetchMessages(selectedReceiver);
            }, 1000);
          }
        }
        
        // 3. Local state'i güncelle
        setMessages(prev => prev.filter(m => m.id !== msgId));
        console.log("DirectChat: ✅ Local state güncellendi");
        
        // 4. Karşı tarafın da görmesi için anlık yenileme (mouse hareketi olmadan da)
        const instantRefresh = async () => {
          try {
            console.log("DirectChat: 🚀 Anlık yenileme başlatılıyor...");
            await fetchMessages(selectedReceiver);
            console.log("DirectChat: ✅ Anlık yenileme tamamlandı");
          } catch (error) {
            console.log("DirectChat: ⚠️ Anlık yenileme hatası:", error.message);
          }
        };
        
        // Hemen yenileme (0ms)
        instantRefresh();
        
        // 100ms sonra da bir kez daha (güvenlik için)
        setTimeout(instantRefresh, 100);
        
      } else {
        console.log("DirectChat: ❌ HTTP API ile mesaj silinemedi:", response.status);
      }
    } catch (error) {
      console.error("DirectChat: ❌ Mesaj silme hatası:", error);
    }
  };

  // Kullanıcı seçimi
  const handleUserSelect = (userId) => {
    console.log("DirectChat: Kullanıcı seçildi:", userId);
    console.log("DirectChat: Önceki selectedReceiver:", selectedReceiver);
    console.log("DirectChat: Önceki mesaj sayısı:", messages.length);
    console.log("DirectChat: External bekleyen mesaj sayısı:", externalPendingMessages.length);
    
    setSelectedReceiver(userId);
    
    // Bu kullanıcıdan gelen bekleyen mesajları kontrol et
    const relevantPendingMessages = externalPendingMessages.filter(msg => 
      String(msg.senderId) === String(userId)
    );
    
    if (relevantPendingMessages.length > 0) {
      console.log("DirectChat: 🎯 Bekleyen mesajlar bulundu:", relevantPendingMessages.length);
      console.log("DirectChat: 📨 Bekleyen mesaj içerikleri:", relevantPendingMessages.map(m => m.content));
      
      // Mesaj tipini belirle
      const enrichedMessages = relevantPendingMessages.map(msg => {
        if (!msg.type) {
          if (msg.content && (
            msg.content.startsWith('data:image') || 
            msg.content.includes('base64') ||
            msg.content.includes('image') ||
            (msg.content.includes('http') && (
              msg.content.includes('.jpg') || 
              msg.content.includes('.jpeg') || 
              msg.content.includes('.png') || 
              msg.content.includes('.gif')
            ))
          )) {
            msg.type = "image";
            console.log("DirectChat: 🖼️ Kullanıcı seçiminde resim mesajı tespit edildi:", {
              id: msg.id,
              content: msg.content ? msg.content.substring(0, 50) + "..." : null,
              type: msg.type
            });
          } else {
            msg.type = "text";
          }
        }
        return msg;
      });
      
      // Bekleyen mesajları hemen ekle
      setMessages(enrichedMessages);
      
      // Bekleyen mesajları temizle
      if (onPendingMessagesCleared) {
        onPendingMessagesCleared(relevantPendingMessages);
      }
      
      console.log("DirectChat: ✅ Bekleyen mesajlar eklendi ve temizlendi");
    } else {
      console.log("DirectChat: ℹ️ Bu kullanıcı için bekleyen mesaj yok, mesajlar temizleniyor");
      setMessages([]);
    }
    
    console.log("DirectChat: Kullanıcı seçimi tamamlandı");
  };

  // Bekleyen mesajları kontrol eden fonksiyon
  const checkAndAddPendingMessages = (receiverId) => {
    // Bekleyen mesajları kontrol et
    console.log("DirectChat: 🔍 Bekleyen mesajlar kontrol ediliyor...");
    console.log("DirectChat: 📊 Bekleyen mesaj sayısı:", externalPendingMessages.length);
    console.log("DirectChat: 📝 Bekleyen mesajlar:", externalPendingMessages.map(m => ({ 
      senderId: m.senderId, 
      content: m.content, 
      timestamp: m.timestamp 
    })));
    
    if (externalPendingMessages.length > 0) {
      // Bu kullanıcıdan gelen bekleyen mesajları bul
      const relevantPendingMessages = externalPendingMessages.filter(msg => 
        String(msg.senderId) === String(receiverId)
      );
      
      if (relevantPendingMessages.length > 0) {
        console.log("DirectChat: 🎯 Bu kullanıcı için bekleyen mesajlar bulundu:", relevantPendingMessages.length);
        console.log("DirectChat: 📨 Bekleyen mesaj içerikleri:", relevantPendingMessages.map(m => m.content));
        
        // Mesaj tipini belirle
        const enrichedMessages = relevantPendingMessages.map(msg => {
          if (!msg.type) {
            if (msg.content && (
              msg.content.startsWith('data:image') || 
              msg.content.includes('base64') ||
              msg.content.includes('image') ||
              (msg.content.includes('http') && (
                msg.content.includes('.jpg') || 
                msg.content.includes('.jpeg') || 
                msg.content.includes('.png') || 
                msg.content.includes('.gif')
              ))
            )) {
              msg.type = "image";
              console.log("DirectChat: 🖼️ Kullanıcı seçiminde resim mesajı tespit edildi:", {
                id: msg.id,
                content: msg.content ? msg.content.substring(0, 50) + "..." : null,
                type: msg.type
              });
            } else {
              msg.type = "text";
            }
          }
          return msg;
        });
        
        // Bekleyen mesajları hemen ekle
        setMessages(enrichedMessages);
        
        // Bekleyen mesajları temizle
        if (onPendingMessagesCleared) {
          onPendingMessagesCleared(relevantPendingMessages);
        }
        
        console.log("DirectChat: ✅ Bekleyen mesajlar eklendi ve temizlendi");
      } else {
        console.log("DirectChat: ℹ️ Bu kullanıcı için bekleyen mesaj yok, mesajlar temizleniyor");
        setMessages([]);
      }
    } else {
      console.log("DirectChat: ℹ️ Hiç bekleyen mesaj yok");
    }
  };

  // Mesaj kutusu açıldığında okunmamış sayıları sıfırla
  useEffect(() => {
    if (isOpen && selectedReceiver) {
      console.log("DirectChat: Mesaj kutusu açıldı, bildirimler sıfırlanıyor...");
      console.log("DirectChat: Seçili kullanıcı:", selectedReceiver);
      console.log("DirectChat: Mevcut mesaj sayısı:", messages.length);
      
      // Bekleyen mesajları kontrol et ve ekle
      checkAndAddPendingMessages(selectedReceiver);
      
      // Eğer mesajlar yoksa veya çok azsa, backend'den tekrar çek
      if (messages.length === 0 || messages.length < 5) {
        console.log("DirectChat: Mesajlar eksik, backend'den tekrar çekiliyor...");
        fetchMessages(selectedReceiver);
      }
      
      // Seçili kullanıcı ile olan mesajları okundu olarak işaretle
      markMessagesAsRead(selectedReceiver);
      // Ana uygulamaya bildirim sıfırlandığını bildir
      if (onNewMessage) {
        console.log("DirectChat: Ana uygulamaya bildirim sıfırlandığı bildiriliyor");
        onNewMessage();
      }
    }
  }, [isOpen, selectedReceiver, onNewMessage]);

  // DirectChat kapandığında sadece event handler'ları temizle, bağlantıyı kapatma
  useEffect(() => {
    if (!isOpen && connectionRef.current) {
      console.log("DirectChat: Kapatıldı, sadece event handler'lar temizleniyor...");
      try {
        // Event handler'ları temizle
        connectionRef.current.off("ReceiveMessage");
        connectionRef.current.off("receivemessage");
        console.log("DirectChat: ✅ Event handler'lar temizlendi, bağlantı açık tutuldu");
      } catch (error) {
        console.log("DirectChat: ⚠️ Event handler temizleme hatası:", error);
      }
    }
  }, [isOpen]);

  // Akıllı otomatik yenileme sistemi
  useEffect(() => {
    if (!isOpen || !selectedReceiver || !connection || !isConnected) {
      return; // Gerekli koşullar yoksa çalışmasın
    }

    let intervalId;
    let lastMessageCount = messages.length;
    let consecutiveNoChangeCount = 0;
    let isUserActive = true;

    // Kullanıcı aktivitesini takip et
    const handleUserActivity = () => {
      isUserActive = true;
      consecutiveNoChangeCount = 0; // Kullanıcı aktifse sayacı sıfırla
      
      // Sadece mesaj sayısı değiştiyse yenileme yap (ekranı en alta götürme)
      // Mouse hareketi sonrası otomatik yenileme yapma
    };

    // Kullanıcı aktivite event'lerini dinle
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Akıllı yenileme fonksiyonu
    const smartRefresh = async () => {
      try {
        // Kullanıcı aktif değilse daha yavaş yenile
        if (!isUserActive) {
          consecutiveNoChangeCount++;
          
          // 5 kez üst üste değişiklik yoksa daha da yavaşla
          if (consecutiveNoChangeCount > 5) {
            console.log("DirectChat: 🐌 Kullanıcı pasif, çok yavaş yenileme (30s)");
            return; // 30 saniye bekle
          }
        }

        // Mesaj sayısı değişmediyse daha yavaş yenile
        if (messages.length === lastMessageCount) {
          consecutiveNoChangeCount++;
          
          if (consecutiveNoChangeCount > 3) {
            console.log("DirectChat: 🐌 Mesaj değişikliği yok, yavaş yenileme (15s)");
            return; // 15 saniye bekle
          }
        } else {
          // Mesaj sayısı değiştiyse sayacı sıfırla
          consecutiveNoChangeCount = 0;
          lastMessageCount = messages.length;
        }

        // Normal yenileme
        console.log("DirectChat: 🔄 Akıllı yenileme başlatılıyor...");
        await fetchMessages(selectedReceiver);
        
        // Kullanıcıyı pasif olarak işaretle (sonraki yenilemede)
        isUserActive = false;
        
      } catch (error) {
        console.log("DirectChat: ⚠️ Akıllı yenileme hatası:", error.message);
        // Hata durumunda daha yavaş yenile
        consecutiveNoChangeCount++;
      }
    };

    // Dinamik interval süresi hesapla
    const calculateInterval = () => {
      if (consecutiveNoChangeCount > 5) return 30000; // 30 saniye
      if (consecutiveNoChangeCount > 3) return 15000; // 15 saniye
      if (!isUserActive) return 20000; // 20 saniye
      return 1000; // 1 saniye (kullanıcı aktifken çok hızlı!)
    };

    // İlk interval'i başlat
    const startInterval = () => {
      const interval = calculateInterval();
      console.log(`DirectChat: ⏰ Yenileme interval'i başlatıldı: ${interval/1000}s`);
      
      intervalId = setInterval(smartRefresh, interval);
    };

    // Interval'i yeniden başlat
    const restartInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      startInterval();
    };

    // İlk çalıştırma
    startInterval();

    // Mesaj sayısı değiştiğinde interval'i yeniden başlat
    const messageCountChangeInterval = setInterval(() => {
      if (messages.length !== lastMessageCount) {
        lastMessageCount = messages.length;
        consecutiveNoChangeCount = 0;
        restartInterval();
      }
    }, 5000); // Her 5 saniyede bir kontrol et

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (messageCountChangeInterval) {
        clearInterval(messageCountChangeInterval);
      }
      
      // Event listener'ları temizle
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      console.log("DirectChat: 🧹 Akıllı yenileme sistemi temizlendi");
    };
  }, [isOpen, selectedReceiver, connection, isConnected, messages.length]);

  // Performans izleme sistemi
  useEffect(() => {
    if (!isOpen) return;

    let performanceTimer;
    let refreshCount = 0;
    const maxRefreshPerMinute = 60; // Dakikada maksimum 60 yenileme (1 saniyede bir için)

    const checkPerformance = () => {
      refreshCount++;
      
      if (refreshCount > maxRefreshPerMinute) {
        console.warn("DirectChat: ⚠️ PERFORMANS UYARISI: Çok fazla yenileme yapılıyor!");
        console.warn("DirectChat: 🔧 Yenileme sistemi geçici olarak durduruldu (1 dakika)");
        
        // 1 dakika boyunca yenilemeyi durdur
        setTimeout(() => {
          refreshCount = 0;
          console.log("DirectChat: ✅ Performans normal, yenileme sistemi tekrar aktif");
        }, 60000);
      }
    };

    // Her yenilemede performans kontrolü
    performanceTimer = setInterval(checkPerformance, 60000); // Her dakika kontrol

    return () => {
      if (performanceTimer) {
        clearInterval(performanceTimer);
      }
    };
  }, [isOpen]);

  // Resim optimizasyonu fonksiyonu
  const optimizeImage = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Hata durumunda orijinal dosyayı kullan
        img.onerror = () => {
          console.log("DirectChat: ⚠️ Resim yüklenemedi, orijinal dosya kullanılıyor");
          resolve(file);
        };
        
        img.onload = () => {
          try {
            // Maksimum boyutlar (1920x1080)
            const maxWidth = 1920;
            const maxHeight = 1080;
            
            let { width, height } = img;
            
            // Boyut oranını koru
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            
            // Canvas boyutunu ayarla
            canvas.width = width;
            canvas.height = height;
            
            // Resmi çiz (yumuşak geçiş için)
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // JPEG formatında optimize et (kalite: 0.8)
            canvas.toBlob((blob) => {
              if (blob) {
                // Optimize edilmiş dosya oluştur
                const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                
                console.log("DirectChat: 🖼️ Resim optimize edildi:", {
                  orijinal: `${file.size} bytes`,
                  optimize: `${optimizedFile.size} bytes`,
                  boyut: `${width}x${height}px`
                });
                
                resolve(optimizedFile);
              } else {
                console.log("DirectChat: ⚠️ Canvas blob oluşturulamadı, orijinal dosya kullanılıyor");
                resolve(file);
              }
            }, 'image/jpeg', 0.8);
          } catch (canvasError) {
            console.log("DirectChat: ⚠️ Canvas hatası, orijinal dosya kullanılıyor:", canvasError);
            resolve(file);
          }
        };
        
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.log("DirectChat: ⚠️ Genel optimizasyon hatası, orijinal dosya kullanılıyor", error);
        resolve(file);
      }
    });
  };

  // Resim seçme fonksiyonu
  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Dosya boyutu kontrolü (10MB - optimize edilecek)
      if (file.size > 10 * 1024 * 1024) {
        alert("❌ Resim boyutu 10MB'dan büyük olamaz!");
        return;
      }

      // Dosya tipi kontrolü
      if (!file.type.startsWith('image/')) {
        alert("❌ Lütfen sadece resim dosyası seçin!");
        return;
      }

      try {
        // Resmi optimize et
        const optimizedFile = await optimizeImage(file);
        setSelectedImage(optimizedFile);
        
        // Önizleme oluştur
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(optimizedFile);
        
        console.log("DirectChat: ✅ Resim optimize edildi ve seçildi");
      } catch (error) {
        console.error("DirectChat: ❌ Resim optimizasyon hatası:", error);
        // Hata durumunda orijinal dosyayı kullan
        setSelectedImage(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Resim gönderme fonksiyonu
  const sendImage = async () => {
    if (!isConnected || !selectedImage || !selectedReceiver) {
      alert("❌ Lütfen resim seçin ve bağlantının kurulmasını bekleyin!");
      return;
    }

    setUploadingImage(true);

    try {
      // Resmi base64'e çevir
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          if (e.target.result) {
            resolve(e.target.result);
          } else {
            reject(new Error("FileReader sonucu boş"));
          }
        };
        
        reader.onerror = (error) => {
          console.log("DirectChat: ⚠️ FileReader hatası, alternatif yöntem deneniyor...");
          // Alternatif yöntem: URL.createObjectURL
          try {
            const url = URL.createObjectURL(selectedImage);
            // URL'den base64'e çevir
            fetch(url)
              .then(res => res.blob())
              .then(blob => {
                const reader2 = new FileReader();
                reader2.onload = (e2) => resolve(e2.target.result);
                reader2.onerror = () => reject(new Error("Alternatif yöntem de başarısız"));
                reader2.readAsDataURL(blob);
              })
              .catch(() => reject(new Error("Fetch hatası")));
          } catch (urlError) {
            reject(urlError);
          }
        };
        
        reader.readAsDataURL(selectedImage);
      });

      // Local mesaj ekle
      const tempMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: String(currentUser.id),
        senderName: currentUser.adSoyad || currentUser.kullaniciAdi || `Kullanıcı ${currentUser.id}`,
        senderCompany: currentUser.sirketAdi || "",
        receiverId: String(selectedReceiver),
        content: base64Image,
        timestamp: new Date().toISOString(),
        type: "image",
        isRead: false
      };

      setMessages(prev => [...prev, tempMessage]);
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      setIsImageDialogOpen(false);

      // SignalR ile resim mesajını gönder
      if (connection && isConnected) {
        try {
          await connection.invoke(
            "SendDirectMessage",
            String(currentUser.id),
            String(selectedReceiver),
            base64Image
          );
          console.log("DirectChat: ✅ Resim SignalR ile başarıyla gönderildi");
        } catch (signalRError) {
          console.error("DirectChat: SignalR resim gönderme hatası:", signalRError);
          // Hata durumunda HTTP API ile dene
          try {
            console.log("DirectChat: HTTP API ile resim mesajı gönderiliyor...");
            const response = await fetch(`${API_URL}/api/Messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                senderId: String(currentUser.id),
                receiverId: String(selectedReceiver),
                content: base64Image,
                timestamp: new Date().toISOString(),
                type: "image"
              })
            });
            
            if (response.ok) {
              console.log("DirectChat: HTTP API ile resim mesajı başarıyla gönderildi");
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (httpError) {
            console.error("DirectChat: HTTP API resim mesajı gönderme hatası:", httpError);
            // Hata durumunda mesajı geri al
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            alert("❌ Resim mesajı gönderilemedi! Lütfen tekrar deneyin.");
          }
        }
      }

      console.log("DirectChat: ✅ Resim başarıyla gönderildi");
    } catch (error) {
      console.error("DirectChat: ❌ Resim gönderme hatası:", error);
      alert("❌ Resim gönderilemedi! Lütfen tekrar deneyin.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Resim seçme dialog'unu aç
  const openImageDialog = () => {
    setIsImageDialogOpen(true);
  };

  // Resim seçme dialog'unu kapat
  const closeImageDialog = () => {
    setIsImageDialogOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Resim büyütme fonksiyonları
  const openImageViewDialog = (imageSrc) => {
    setSelectedImageForView(imageSrc);
    setIsImageViewDialogOpen(true);
    setImageZoom(1); // Zoom'u sıfırla
    setIsFullscreen(false); // Tam ekranı sıfırla
  };

  const closeImageViewDialog = () => {
    setIsImageViewDialogOpen(false);
    setSelectedImageForView(null);
    setImageZoom(1); // Zoom'u sıfırla
    setIsFullscreen(false); // Tam ekranı sıfırla
  };

  // Zoom fonksiyonları
  const zoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.5, 3)); // Maksimum 3x zoom
  };

  const zoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.5, 0.5)); // Minimum 0.5x zoom
  };

  const resetZoom = () => {
    setImageZoom(1);
  };

  // Tam ekran fonksiyonu
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Keyboard shortcut'ları
  useEffect(() => {
    if (isImageViewDialogOpen) {
      const handleKeyDown = (e) => {
        switch (e.key) {
          case 'Escape':
            closeImageViewDialog();
            break;
          case '+':
          case '=':
            e.preventDefault();
            zoomIn();
            break;
          case '-':
            e.preventDefault();
            zoomOut();
            break;
          case '0':
            e.preventDefault();
            resetZoom();
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
          default:
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isImageViewDialogOpen]);

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        zIndex: 1000,
        backgroundColor: "#fafafa",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // Mobil için tam ekran
        "@media (min-width: 768px)": {
          bottom: 20,
          right: 20,
          left: "auto",
          top: "auto",
          width: 380,
          height: 580,
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid #e8eaf6"
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "16px 16px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          // Mobil için tam genişlik
          "@media (max-width: 767px)": {
            borderRadius: 0
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: "600", fontSize: "1.1rem" }}>
            💬 Direkt Mesajlaşma
          </Typography>
          {isConnected ? (
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 0.5,
              bgcolor: "rgba(76, 175, 80, 0.2)",
              px: 1,
              py: 0.5,
              borderRadius: "12px",
              border: "1px solid rgba(76, 175, 80, 0.3)"
            }}>
              <Box sx={{ width: 6, height: 6, bgcolor: "#4caf50", borderRadius: "50%" }} />
              <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: "500" }}>
                Bağlı
              </Typography>
            </Box>
          ) : (
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 0.5,
              bgcolor: "rgba(244, 67, 54, 0.2)",
              px: 1,
              py: 0.5,
              borderRadius: "12px",
              border: "1px solid rgba(244, 67, 54, 0.3)"
            }}>
              <Box sx={{ width: 6, height: 6, bgcolor: "#f44336", borderRadius: "50%" }} />
              <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: "500" }}>
                Bağlantı Kuruluyor...
              </Typography>
            </Box>
          )}
        </Box>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            color: "white",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Kullanıcı seçimi */}
      <Box sx={{ 
        p: 2.5, 
        borderBottom: "1px solid #e8eaf6",
        bgcolor: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: "#666", fontWeight: "500" }}>👥 Kullanıcı Seç</InputLabel>
          <Select
            value={selectedReceiver}
            onChange={(e) => handleUserSelect(e.target.value)}
            label="👥 Kullanıcı Seç"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#667eea"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#667eea"
                }
              }
            }}
          >
            {availableUsers.map((user) => (
              <MenuItem key={user.id} value={user.id} sx={{ py: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: user.rol === "yonetici" ? "#ff9800" : "#2196f3",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                    }}
                  >
                    {user.adSoyad?.[0] || user.kullaniciAdi?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: "600", color: "#333", mb: 0.5 }}>
                      {user.adSoyad || user.kullaniciAdi}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {user.rol === "yonetici" && (
                        <Box sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 0.5,
                          bgcolor: "#fff3e0",
                          px: 1,
                          py: 0.3,
                          borderRadius: "8px",
                          border: "1px solid #ffb74d"
                        }}>
                          <span style={{ color: "#ff9800", fontSize: "14px" }}>👑</span>
                          <Typography variant="caption" sx={{ color: "#e65100", fontWeight: "600", fontSize: "0.7rem" }}>
                            Yönetici
                          </Typography>
                        </Box>
                      )}
                      {user.rol === "müşteri" && (
                        <Box sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 0.5,
                          bgcolor: "#e3f2fd",
                          px: 1,
                          py: 0.3,
                          borderRadius: "8px",
                          border: "1px solid #90caf9"
                        }}>
                                                   <span style={{ color: "#2196f3", fontSize: "14px" }}>👤</span>
                         <Typography variant="caption" sx={{ color: "#1565c0", fontWeight: "600", fontSize: "0.7rem" }}>
                           Müşteri
                         </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {unreadCounts[user.id] > 0 && (
                    <Chip
                      label={unreadCounts[user.id]}
                      size="small"
                      color="error"
                      sx={{ ml: "auto", fontWeight: "600" }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Mesaj listesi */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2.5,
          background: "linear-gradient(180deg, #fffbf0 0%, #fff3e0 100%)",
          position: "relative"
        }}
      >
        {!selectedReceiver ? (
          <Box sx={{ textAlign: "center", mt: 6, p: 3 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: "#e3f2fd", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              mx: "auto",
              mb: 2
            }}>
              <span style={{ fontSize: "32px" }}>💬</span>
            </Box>
            <Typography variant="h6" color="#333" sx={{ mb: 2, fontWeight: "600" }}>
              Mesajlaşmaya Başlayın
            </Typography>
            <Typography variant="body2" color="#666" sx={{ mb: 2, lineHeight: 1.6 }}>
              Mesajlaşmak için bir kullanıcı seçin
            </Typography>
            {currentUser.rol === "yonetici" ? (
              <Box sx={{ 
                bgcolor: "#e8f5e8", 
                p: 2, 
                borderRadius: "12px", 
                border: "1px solid #c8e6c9",
                maxWidth: 300,
                mx: "auto"
              }}>
                <Typography variant="body2" color="#2e7d32" sx={{ fontWeight: "600", textAlign: "center" }}>
                  👑 Yönetici olarak hem yöneticiler hem müşterilerle konuşabilirsiniz
                </Typography>
              </Box>
            ) : (
              <Box sx={{ 
                bgcolor: "#fff3e0", 
                p: 2, 
                borderRadius: "12px", 
                border: "1px solid #ffb74d",
                maxWidth: 300,
                mx: "auto"
              }}>
                <Typography variant="body2" color="#e65100" sx={{ fontWeight: "600", textAlign: "center" }}>
                  👤 Müşteri olarak SADECE yöneticilerle konuşabilirsiniz
                </Typography>
              </Box>
            )}
            
            {/* Müşteri ise ve hiç yönetici yoksa uyarı göster */}
            {currentUser.rol === "müşteri" && availableUsers.length === 0 && (
              <Box sx={{ 
                mt: 3, 
                p: 2.5, 
                bgcolor: '#fff3e0', 
                borderRadius: "12px", 
                border: '1px solid #ffb74d',
                maxWidth: 300,
                mx: "auto"
              }}>
                <Typography variant="body2" color="#e65100" sx={{ fontWeight: 'bold', textAlign: "center", mb: 1 }}>
                  🚫 Mesajlaşabileceğiniz yönetici bulunamadı!
                </Typography>
                <Typography variant="caption" color="#e65100" sx={{ textAlign: "center", display: "block" }}>
                  Lütfen daha sonra tekrar deneyin veya sistem yöneticisi ile iletişime geçin.
                </Typography>
              </Box>
            )}
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 6, p: 3 }}>
            <Box sx={{ 
              width: 60, 
              height: 60, 
              bgcolor: "#e8f5e8", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              mx: "auto",
              mb: 2
            }}>
              <span style={{ fontSize: "24px" }}>✨</span>
            </Box>
            <Typography variant="h6" color="#333" sx={{ mb: 1, fontWeight: "600" }}>
              İlk Mesajı Siz Gönderin!
            </Typography>
            <Typography variant="body2" color="#666">
              Henüz mesaj yok. Sohbete başlamak için mesaj yazın.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 0 }}>
            {(() => {
              // Duplicate mesajları filtrele ve ID kontrolü yap
              const uniqueMessages = messages.filter((msg, index, self) => {
                // ID yoksa veya undefined ise filtrele
                if (!msg || !msg.id) {
                  console.log("DirectChat: ⚠️ ID'siz mesaj bulundu:", msg);
                  return false;
                }
                return index === self.findIndex(m => m && m.id && m.id === msg.id);
              });
              
              if (uniqueMessages.length !== messages.length) {
                console.log("DirectChat: 🧹 Duplicate/ID'siz mesajlar temizlendi:", messages.length - uniqueMessages.length);
                setMessages(uniqueMessages);
              }
              
              return uniqueMessages.map((msg) => {
                const isMine = String(msg.senderId) === String(currentUser.id);
              return (
                <Box
                  key={`${msg.id}_${msg.timestamp}_${msg.senderId}`}
                  sx={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    mb: 1
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "75%",
                      position: "relative"
                    }}
                  >
                    {/* Modern ve Güzel Mesaj Balonu */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        alignItems: "flex-end",
                        mb: 1.5,
                        px: 0.5,
                        width: "100%"
                      }}
                    >
                      {/* Mesaj Balonu - WhatsApp Tarzı Dinamik */}
                      <Box
                        sx={{
                          display: "inline-block",
                          maxWidth: "65%",
                          minWidth: "80px",
                          position: "relative"
                        }}
                      >
                        {/* Gönderen Adı (sadece karşıdan gelen mesajlar için) */}
                        {!isMine && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: "#374151", 
                              fontWeight: "600", 
                              mb: 0.5, 
                              ml: 0.5,
                              display: "block",
                              fontSize: "0.75rem"
                            }}
                          >
                            {msg.senderName || `Kullanıcı ${msg.senderId}`}
                          </Typography>
                        )}
                        
                        <Box
                          sx={{
                            p: 1.5,
                            backgroundColor: isMine ? "#e3f2fd" : "#ffffff",
                            borderRadius: isMine 
                              ? "16px 16px 4px 16px" 
                              : "16px 16px 16px 4px",
                            boxShadow: isMine 
                              ? "0 2px 8px rgba(227, 242, 253, 0.3)" 
                              : "0 2px 8px rgba(0,0,0,0.08)",
                            border: isMine ? "1px solid #bbdefb" : "1px solid #e5e7eb",
                            position: "relative",
                            wordBreak: "break-word",
                            width: "fit-content",
                            maxWidth: "100%",
                            minHeight: "40px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                          }}
                        >
                          {/* Mesaj İçeriği */}
                          {msg.type === "image" || 
                           (msg.content && (
                             msg.content.startsWith('data:image') || 
                             msg.content.includes('base64') ||
                             msg.content.includes('image') ||
                             (msg.content.includes('http') && (
                               msg.content.includes('.jpg') || 
                               msg.content.includes('.jpeg') || 
                               msg.content.includes('.png') || 
                               msg.content.includes('.gif')
                             ))
                           )) ? (
                            <Box sx={{ textAlign: "center" }}>
                              <img 
                                src={msg.content} 
                                alt="Resim mesajı" 
                                style={{ 
                                  maxWidth: "100%", 
                                  maxHeight: "200px", 
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  transition: "all 0.3s ease",
                                  border: "2px solid #4caf50",
                                  boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)"
                                }} 
                                onClick={() => openImageViewDialog(msg.content)}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = "scale(1.08)";
                                  e.target.style.boxShadow = "0 4px 16px rgba(76, 175, 80, 0.5)";
                                  e.target.style.borderColor = "#66bb6a";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "scale(1)";
                                  e.target.style.boxShadow = "0 2px 8px rgba(76, 175, 80, 0.3)";
                                  e.target.style.borderColor = "#4caf50";
                                }}
                                onError={(e) => {
                                  console.log("DirectChat: ❌ Resim yüklenemedi:", {
                                    content: msg.content,
                                    type: msg.type,
                                    id: msg.id
                                  });
                                  e.target.style.display = 'none';
                                  // Hata durumunda fallback metin göster
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                              {/* Hover bilgisi */}
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: "block",
                                  color: "#4caf50",
                                  fontWeight: "500",
                                  mt: 0.5,
                                  fontSize: "0.7rem",
                                  opacity: 0.8
                                }}
                              >
                                🔍 Tıklayarak büyüt
                              </Typography>
                              {/* Fallback metin - resim yüklenemezse göster */}
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  display: "none",
                                  color: "#666",
                                  fontStyle: "italic",
                                  mt: 1
                                }}
                              >
                                [Resim yüklenemedi: {msg.content ? msg.content.substring(0, 50) + "..." : "Bilinmeyen içerik"}]
                              </Typography>
                            </Box>
                          ) : (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: "500", 
                                lineHeight: 1.4,
                                fontSize: "0.85rem",
                                mb: 0.5,
                                letterSpacing: "0.1px",
                                color: "#000000",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                                textAlign: isMine ? "right" : "left"
                              }}
                            >
                              {msg.content}
                            </Typography>
                          )}
                          
                          {/* Zaman */}
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: "#666666",
                              fontSize: "0.6rem",
                              display: "block",
                              textAlign: "right",
                              fontWeight: "500"
                            }}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Typography>
                        </Box>
                        
                        {/* Silme Butonu - Daha Şık */}
                        {isMine && (
                          <IconButton
                            size="small"
                            onClick={() => deleteMessage(msg.id)}
                            sx={{
                              position: "absolute",
                              top: -8,
                              right: -8,
                              bgcolor: "#e74c3c",
                              color: "white",
                              width: 26,
                              height: 26,
                              "&:hover": { 
                                bgcolor: "#c0392b",
                                transform: "scale(1.1)"
                              },
                              transition: "all 0.2s ease",
                              boxShadow: "0 3px 10px rgba(231, 76, 60, 0.3)",
                              border: "2px solid white"
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: "14px" }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            });
          })()}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Mesaj gönderme */}
      {selectedReceiver && (
        <Box sx={{ 
          p: 2.5, 
          borderTop: "1px solid #e0e0e0",
          bgcolor: "white"
        }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
            {/* Resim Seçme Butonu */}
            <IconButton
              onClick={openImageDialog}
              disabled={!isConnected}
              sx={{
                minWidth: "48px",
                height: "40px",
                borderRadius: "50%",
                bgcolor: "#4caf50",
                color: "white",
                "&:hover": { bgcolor: "#388e3c" },
                "&:disabled": { bgcolor: "#ccc" }
              }}
              title="Resim Gönder"
            >
              <ImageIcon sx={{ fontSize: "18px" }} />
            </IconButton>
            
            <TextField
              fullWidth
              size="small"
              placeholder="💬 Mesajınızı yazın..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={!isConnected}
              multiline
              maxRows={3}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#1976d2"
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#1976d2"
                  }
                }
              }}
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={!message || !isConnected}
              sx={{ 
                minWidth: "48px", 
                height: "40px",
                borderRadius: "50%",
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" },
                "&:disabled": { bgcolor: "#ccc" }
              }}
            >
              <SendIcon sx={{ fontSize: "18px" }} />
            </Button>
          </Box>
          {!isConnected && (
            <Box sx={{ 
              mt: 1.5, 
              p: 1.5, 
              bgcolor: "#fff3e0", 
              borderRadius: "8px", 
              border: "1px solid #ffb74d",
              display: "flex",
              alignItems: "center",
              gap: 1
            }}>
              <span style={{ color: "#f57c00", fontSize: "16px" }}>⏳</span>
              <Typography variant="caption" color="#e65100" sx={{ fontWeight: "500" }}>
                Bağlantı kuruluyor...
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Resim Seçme ve Önizleme Dialog'u */}
      <Dialog 
        open={isImageDialogOpen} 
        onClose={closeImageDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 1,
          bgcolor: "#f5f5f5"
        }}>
          📷 Resim Gönder
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Resim Seçme */}
            <Box sx={{ textAlign: "center", p: 3, border: "2px dashed #ccc", borderRadius: 2 }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                id="directchat-image-upload-input"
                ref={fileInputRef}
              />
              <label htmlFor="directchat-image-upload-input">
                <Box sx={{ 
                  cursor: "pointer",
                  p: 2,
                  "&:hover": { bgcolor: "rgba(76, 175, 80, 0.1)" },
                  borderRadius: 1
                }}>
                  <AttachFileIcon sx={{ fontSize: 48, color: "#4caf50", mb: 1 }} />
                  <Typography variant="h6" color="primary">
                    Resim Seç
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Galeriden veya bilgisayarınızdan resim seçin
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Maksimum 10MB, JPG, PNG, GIF desteklenir
                  </Typography>
                </Box>
              </label>
            </Box>

            {/* Seçilen Resim Önizleme */}
            {imagePreview && (
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
                  Seçilen Resim:
                </Typography>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: "100%", 
                    maxHeight: "200px", 
                    borderRadius: "8px",
                    border: "1px solid #ddd"
                  }} 
                />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {selectedImage?.name} ({(selectedImage?.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}

            {/* Opsiyonel Mesaj */}
            <TextField
              fullWidth
              size="small"
              placeholder="💬 Resimle birlikte mesaj yazın (opsiyonel)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={2}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px"
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeImageDialog} color="inherit">
            İptal
          </Button>
          <Button 
            onClick={sendImage} 
            variant="contained" 
            disabled={!selectedImage || uploadingImage}
            startIcon={uploadingImage ? <span>⏳</span> : <SendIcon />}
            sx={{ bgcolor: "#4caf50" }}
          >
            {uploadingImage ? "Gönderiliyor..." : "Resmi Gönder"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resim Büyütme Dialog'u */}
      <Dialog 
        open={isImageViewDialogOpen} 
        onClose={closeImageViewDialog}
        maxWidth={isFullscreen ? false : "lg"}
        fullWidth={!isFullscreen}
        fullScreen={isFullscreen}
        PaperProps={{
          sx: {
            bgcolor: "rgba(0,0,0,0.9)",
            borderRadius: isFullscreen ? 0 : "12px",
            overflow: "hidden",
            maxHeight: isFullscreen ? "100vh" : "90vh"
          }
        }}
      >
        <DialogContent sx={{ p: 0, textAlign: "center", position: "relative" }}>
          {/* Kapatma Butonu */}
          <IconButton
            onClick={closeImageViewDialog}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              zIndex: 1,
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.3)"
              }
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Zoom Kontrolleri */}
          <Box sx={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            gap: 1,
            zIndex: 1
          }}>
            <IconButton
              onClick={zoomIn}
              disabled={imageZoom >= 3}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                "&:disabled": { bgcolor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }
              }}
            >
              <span style={{ fontSize: "18px" }}>🔍+</span>
            </IconButton>
            <IconButton
              onClick={zoomOut}
              disabled={imageZoom <= 0.5}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                "&:disabled": { bgcolor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }
              }}
            >
              <span style={{ fontSize: "18px" }}>🔍-</span>
            </IconButton>
            <IconButton
              onClick={resetZoom}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" }
              }}
            >
              <span style={{ fontSize: "18px" }}>🔄</span>
            </IconButton>
            <IconButton
              onClick={toggleFullscreen}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" }
              }}
            >
              <span style={{ fontSize: "18px" }}>{isFullscreen ? "⛶" : "⛶"}</span>
            </IconButton>
          </Box>

          {/* Zoom Seviyesi Göstergesi */}
          <Box sx={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(0,0,0,0.7)",
            color: "white",
            px: 2,
            py: 1,
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "500",
            zIndex: 1
          }}>
            {Math.round(imageZoom * 100)}%
          </Box>

          {/* Büyük Resim */}
          {selectedImageForView && (
            <img
              src={selectedImageForView}
              alt="Büyük resim"
              style={{
                maxWidth: "100%",
                maxHeight: isFullscreen ? "100vh" : "80vh",
                objectFit: "contain",
                borderRadius: "8px",
                cursor: "pointer",
                transform: `scale(${imageZoom})`,
                transition: "transform 0.2s ease"
              }}
              onClick={() => {
                // Resme tekrar tıklayınca modal'ı kapat
                closeImageViewDialog();
              }}
              onDoubleClick={() => {
                // Çift tıklama ile tam ekran
                toggleFullscreen();
              }}
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                  // Yukarı scroll - zoom in
                  zoomIn();
                } else {
                  // Aşağı scroll - zoom out
                  zoomOut();
                }
              }}
            />
          )}

          {/* Kullanım Talimatları */}
          <Box sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(0,0,0,0.7)",
            color: "white",
            px: 3,
            py: 1.5,
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "500",
            zIndex: 1,
            textAlign: "center"
          }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <span>🖱️ Mouse wheel ile zoom</span>
              <span>⌨️ +/- tuşları ile zoom</span>
              <span>⌨️ 0 tuşu ile sıfırla</span>
              <span>⌨️ ESC ile kapat</span>
              <span>🖱️ Çift tık ile tam ekran</span>
              <span>⌨️ F tuşu ile tam ekran</span>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DirectChat;
