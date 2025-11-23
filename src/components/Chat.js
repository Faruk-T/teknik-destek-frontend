import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from "@mui/material";
import ImageIcon from '@mui/icons-material/Image';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5106";
const CHAT_HUB_URL = `${API_URL}/chathub`;
const MESSAGES_API_URL = `${API_URL}/api/messages`;

const Chat = ({ senderId, receiverId, ticketId, token, onNewMessage }) => {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageForView, setSelectedImageForView] = useState(null);
  const [isImageViewDialogOpen, setIsImageViewDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Önceki ticketId takibi (gruptan çıkış için)
  const previousTicketIdRef = React.useRef(null);

  // Geçmiş mesajları çek
  useEffect(() => {
    if (ticketId) {
      fetch(`${MESSAGES_API_URL}/history?ticketId=${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          // Mesaj tiplerini belirle
          const enrichedMessages = data.map(msg => {
            if (!msg.type) {
              if (msg.content && (
                msg.content.startsWith('data:image') || 
                msg.content.includes('image') || 
                (msg.content.includes('http') && (
                  msg.content.includes('.jpg') || 
                  msg.content.includes('.jpeg') || 
                  msg.content.includes('.png') || 
                  msg.content.includes('.gif')
                ))
              )) {
                msg.type = "image";
              } else {
                msg.type = "text";
              }
            }
            return msg;
          });
          setMessages(enrichedMessages);
        })
        .catch((err) => console.error("Mesaj geçmişi alınamadı:", err));
    }
  }, [ticketId, token]);

  // SignalR bağlantısını kur
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(CHAT_HUB_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, [token]);

  // SignalR eventleri ayarla ve gruplara katıl/ayrıl
  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        await connection.start();
        setIsConnected(true);

        // Önceki grup varsa ayrıl
        if (previousTicketIdRef.current && previousTicketIdRef.current !== ticketId) {
          await connection.invoke("LeaveTicketGroup", previousTicketIdRef.current);
        }

        if (ticketId) {
          await connection.invoke("JoinTicketGroup", ticketId);
          previousTicketIdRef.current = ticketId;
        }

        connection.on("ReceiveMessage", handleNewMessage);
        
        // Mesaj işleme fonksiyonu
        function handleNewMessage(msg) {
          // Mesaj tipini belirle - Güçlendirilmiş
          if (!msg.type) {
            if (msg.type === "image" || 
                (msg.message && (
                  msg.message.startsWith('data:image') || 
                  msg.message.includes('base64') ||
                  msg.message.includes('image')
                )) ||
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
                ))) {
              msg.type = "image";
              console.log("Chat: 🖼️ Resim mesajı tespit edildi:", {
                id: msg.id,
                message: msg.message ? msg.message.substring(0, 50) + "..." : null,
                content: msg.content ? msg.content.substring(0, 50) + "..." : null,
                type: msg.type
              });
            } else {
              msg.type = "text";
            }
          }
          
          setMessages((prev) => [...prev, msg]);
          
          // Eğer mesaj başka bir kullanıcıdan geldiyse bildirim tetikle
          if (String(msg.senderId) !== String(senderId)) {
            console.log("Yeni mesaj geldi, bildirim tetikleniyor:", msg);
            if (onNewMessage) {
              onNewMessage();
            }
          }
        }

        connection.on("MessageDeleted", (msgId) => {
          setMessages((prev) => prev.filter((m) => m.id !== msgId && m.Id !== msgId));
        });
      } catch (err) {
        setIsConnected(false);
        console.error("SignalR Connection Error: ", err);
      }
    };

    startConnection();

    // Cleanup eventler
    return () => {
              connection.off("ReceiveMessage");
      connection.off("MessageDeleted");
    };
  }, [connection, ticketId, onNewMessage]);

  // Otomatik aşağı kaydırma
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mesaj gönder
  const sendMessage = async () => {
    if (connection && isConnected && message) {
      let tempMessage = null;
      
      try {
        console.log("Mesaj gönderiliyor:", { senderId, receiverId, message, ticketId });
        
        // Local mesaj ekle (anlık görünüm için)
        tempMessage = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderId: String(senderId),
          content: message,
          timestamp: new Date().toISOString(),
          type: "text" // Metin tipi
        };

        setMessages(prev => [...prev, tempMessage]);
        setMessage("");

        // SignalR ile mesajı gönder
        try {
          // Ana metod: SendMessage
          await connection.invoke(
            "SendMessage",
            ticketId,
            String(senderId),
            message
          );
          
          console.log("Mesaj başarıyla gönderildi");
          
        } catch (signalRError) {
          console.error("Chat: SignalR mesaj gönderme hatası:", signalRError);
          
          // Alternatif metodları dene
          try {
            console.log("Chat: Alternatif SignalR metodları deneniyor...");
            
            // Metod 1: SendDirectMessage
            try {
              await connection.invoke("SendDirectMessage", String(senderId), ticketId, message);
              console.log("Chat: ✅ SendDirectMessage ile başarılı!");
              return; // Başarılı olursa çık
            } catch (e1) {
              console.log("Chat: SendDirectMessage başarısız:", e1.message);
            }
            
            // Metod 2: SendTicketMessage
            try {
              await connection.invoke("SendTicketMessage", ticketId, String(senderId), message);
              console.log("Chat: ✅ SendTicketMessage ile başarılı!");
              return; // Başarılı olursa çık
            } catch (e2) {
              console.log("Chat: SendTicketMessage başarısız:", e2.message);
            }
            
            console.log("Chat: Tüm SignalR metodları başarısız, HTTP API deneniyor...");
            
          } catch (fallbackError) {
            console.error("Chat: Alternatif SignalR metodları da başarısız:", fallbackError);
          }
          
          // SignalR hatası durumunda HTTP API ile dene
          try {
            console.log("Chat: HTTP API ile mesaj gönderiliyor...");
            const response = await fetch(`${MESSAGES_API_URL}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                ticketId: ticketId,
                senderId: senderId,
                content: message,
                timestamp: new Date().toISOString(),
                type: "text"
              })
            });
            
            if (response.ok) {
              console.log("Chat: HTTP API ile mesaj başarıyla gönderildi");
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (httpError) {
            console.error("Chat: HTTP API mesaj gönderme hatası:", httpError);
            // Hata durumunda mesajı geri al
            if (tempMessage) {
              setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
              setMessage(message); // Mesajı geri koy
            }
            alert("❌ Mesaj gönderilemedi! Lütfen tekrar deneyin.");
          }
        }
        
      } catch (err) {
        console.error("Mesaj gönderme hatası:", err);
        // Hata durumunda mesajı geri al
        if (tempMessage) {
          setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
          setMessage(message); // Mesajı geri koy
        }
      }
    }
  };

  // Mesaj sil
  const deleteMessage = async (msgId) => {
    try {
      const response = await fetch(`${MESSAGES_API_URL}/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (err) {
      console.error("Mesaj silinemedi:", err);
    }
  };

  // Resim büyütme fonksiyonları
  const openImageViewDialog = (imageSrc) => {
    setSelectedImageForView(imageSrc);
    setIsImageViewDialogOpen(true);
  };

  const closeImageViewDialog = () => {
    setIsImageViewDialogOpen(false);
    setSelectedImageForView(null);
  };

  // Resim optimizasyonu fonksiyonu - Güçlendirilmiş
  const optimizeImage = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Hata durumunda orijinal dosyayı kullan
        img.onerror = () => {
          console.log("Chat: ⚠️ Resim yüklenemedi, orijinal dosya kullanılıyor");
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
                
                console.log("Chat: 🖼️ Resim optimize edildi:", {
                  orijinal: `${file.size} bytes`,
                  optimize: `${optimizedFile.size} bytes`,
                  boyut: `${width}x${height}px`
                });
                
                resolve(optimizedFile);
              } else {
                console.log("Chat: ⚠️ Canvas blob oluşturulamadı, orijinal dosya kullanılıyor");
                resolve(file);
              }
            }, 'image/jpeg', 0.8);
          } catch (canvasError) {
            console.log("Chat: ⚠️ Canvas hatası, orijinal dosya kullanılıyor:", canvasError);
            resolve(file);
          }
        };
        
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.log("Chat: ⚠️ Genel optimizasyon hatası, orijinal dosya kullanılıyor:", error);
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
        
        console.log("Chat: ✅ Resim optimize edildi ve seçildi");
      } catch (error) {
        console.error("Chat: ❌ Resim optimizasyon hatası:", error);
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
    if (!isConnected || !selectedImage || !ticketId) {
      alert("❌ Lütfen resim seçin ve bağlantının kurulmasını bekleyin!");
      return;
    }

    setUploadingImage(true);

    try {
      // FormData oluştur
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('senderId', senderId);
      formData.append('ticketId', ticketId);
      formData.append('message', message || ''); // Opsiyonel mesaj

      // Resmi backend'e yükle
      const response = await fetch(`${API_URL}/api/Messages/upload-ticket-image`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Local mesaj ekle
        const tempMessage = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderId: String(senderId),
          content: result.imageUrl, // Backend'den gelen resim URL'i
          timestamp: new Date().toISOString(),
          type: "image" // Resim tipi
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
              "SendMessage",
              ticketId,
              String(senderId),
              result.imageUrl
            );
            console.log("Chat: ✅ Resim SignalR ile başarıyla gönderildi");
          } catch (signalRError) {
            console.error("Chat: SignalR resim gönderme hatası:", signalRError);
            // SignalR hatası durumunda HTTP API ile dene
            try {
              console.log("Chat: HTTP API ile resim mesajı gönderiliyor...");
              const response = await fetch(`${MESSAGES_API_URL}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  ticketId: ticketId,
                  senderId: senderId,
                  content: result.imageUrl,
                  timestamp: new Date().toISOString(),
                  type: "image"
                })
              });
              
              if (response.ok) {
                console.log("Chat: HTTP API ile resim mesajı başarıyla gönderildi");
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
            } catch (httpError) {
              console.error("Chat: HTTP API resim mesajı gönderme hatası:", httpError);
              // Hata durumunda mesajı geri al
              setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
              alert("❌ Resim mesajı gönderilemedi! Lütfen tekrar deneyin.");
            }
          }
        }

        console.log("Chat: ✅ Resim başarıyla gönderildi");
      } else {
        // Backend yükleme başarısız, base64 olarak gönder
        throw new Error("Backend yükleme başarısız, base64 fallback deneniyor");
      }
      
    } catch (error) {
      console.error("Chat: ❌ Resim gönderme hatası:", error);
      
      // Fallback: Resmi base64 olarak mesaj olarak gönder
      try {
        console.log("Chat: 🔄 Base64 fallback sistemi deneniyor...");
        
        // Resmi base64'e çevir - Güçlendirilmiş Promise
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
            console.log("Chat: ⚠️ FileReader hatası, alternatif yöntem deneniyor...");
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
        
        // Local mesaj ekle - Hem content hem message field'ları
        const tempMessage = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderId: String(senderId),
          content: base64Image, // Base64 resim (eski uyumluluk için)
          message: base64Image, // Base64 resim (yeni format için)
          timestamp: new Date().toISOString(),
          type: "image" // Resim tipi
        };

        setMessages(prev => [...prev, tempMessage]);
        setMessage("");
        setSelectedImage(null);
        setImagePreview(null);
        setIsImageDialogOpen(false);

        // SignalR ile base64 resim mesajını gönder
        if (connection && isConnected) {
          try {
            // Alternatif metodları dene
            try {
              await connection.invoke(
                "SendMessage",
                ticketId,
                String(senderId),
                base64Image
              );
              console.log("Chat: ✅ Base64 resim SignalR ile başarıyla gönderildi");
            } catch (e1) {
              // SendDirectMessage dene
              await connection.invoke("SendDirectMessage", String(senderId), ticketId, base64Image);
              console.log("Chat: ✅ Base64 resim SendDirectMessage ile başarıyla gönderildi");
            }
          } catch (signalRError) {
            console.error("Chat: SignalR base64 resim gönderme hatası:", signalRError);
            // HTTP API ile dene
            try {
              console.log("Chat: HTTP API ile base64 resim mesajı gönderiliyor...");
              console.log("Chat: Request body:", {
                                     message: `[Base64 Resim - ${(base64Image.length / 1024).toFixed(1)}KB]`,
                ticketId: ticketId,
                senderId: String(senderId),
                timestamp: new Date().toISOString(),
                type: "image"
              });
              
              const response = await fetch(`${MESSAGES_API_URL}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  message: base64Image, // Backend 'message' field'ı bekliyor
                  ticketId: ticketId,
                  senderId: String(senderId), // String olarak gönder
                  timestamp: new Date().toISOString(),
                  type: "image"
                })
              });
              
              if (response.ok) {
                console.log("Chat: HTTP API ile base64 resim mesajı başarıyla gönderildi");
              } else {
                const errorText = await response.text();
                console.error("Chat: HTTP API resim hatası:", {
                  status: response.status,
                  statusText: response.statusText,
                  responseText: errorText
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
              }
            } catch (httpError) {
              console.error("Chat: HTTP API base64 resim gönderme hatası:", httpError);
              setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
              alert("❌ Resim gönderilemedi! Lütfen tekrar deneyin.");
            }
          }
        }
        
      } catch (fallbackError) {
        console.error("Chat: ❌ Base64 fallback da başarısız:", fallbackError);
        alert("❌ Resim gönderilemedi! Lütfen tekrar deneyin.");
      }
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

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  // Mobil kontrolü
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          border: isMobile ? "none" : "1px solid #ccc",
          marginBottom: isMobile ? 5 : 10,
          padding: isMobile ? 8 : 10,
          background: "#f5f7fa",
        }}
      >
        {messages.map((msg, idx) => {
          const isMine = String(msg.senderId) === String(senderId);
          const msgId = msg.id || msg.Id; // API'den gelen id küçük/büyük olabilir
          return (
            <div
              key={msgId || idx}
                              style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMine ? "flex-end" : "flex-start",
                  marginBottom: 8,
                  paddingLeft: isMobile ? 4 : 8,
                  paddingRight: isMobile ? 4 : 8,
                }}
            >
                <div
                  style={{
                    background: isMine ? "#d1e7dd" : "#fff",
                    color: "#222",
                    borderRadius: 12,
                    padding: "8px 14px",
                    maxWidth: isMobile ? "92%" : "85%",
                    boxShadow: "0 1px 4px #0001",
                    position: "relative",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 2 }}>
                    {msg.senderName || msg.senderId}
                    {msg.senderCompany && (
                      <span style={{ color: "#888", fontWeight: "normal", fontSize: 12 }}>
                        {" "}
                        ({msg.senderCompany})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 15 }}>
                    {msg.type === "image" || 
                     (msg.message && (msg.message.startsWith('data:image') || msg.message.includes('base64'))) || 
                     (msg.content && (msg.content.startsWith('data:image') || msg.content.includes('base64'))) ? (
                      <img 
                        src={msg.message || msg.content} 
                        alt={`Message image`} 
                        style={{ 
                          maxWidth: "100%", 
                          maxHeight: "200px", 
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "transform 0.2s ease"
                        }} 
                        onClick={() => openImageViewDialog(msg.message || msg.content)}
                        onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                        onError={(e) => {
                          console.log("Chat: ❌ Resim yüklenemedi:", {
                            message: msg.message,
                            content: msg.content,
                            type: msg.type,
                            id: msg.id
                          });
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      msg.message || msg.content
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                  {isMine && (
                    <button
                      onClick={() => deleteMessage(msgId)}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "transparent",
                        border: "none",
                        color: "#888",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                      title="Mesajı sil"
                    >
                      🗑️
                    </button>
                  )}
                </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 0",
          borderTop: "1px solid #eee",
          background: "#f8fafc",
        }}
      >
        {/* Resim Yükleme Butonu */}
        <button
          onClick={openImageDialog}
          disabled={!isConnected}
          style={{
            background: "transparent",
            border: "1px solid #38bdf8",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            marginRight: "8px",
            cursor: isConnected ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#38bdf8",
            transition: "all 0.2s",
          }}
          title="Resim Gönder"
        >
          📷
        </button>

        <input
          value={message}
          onChange={handleInputChange}
          placeholder="Mesajınızı yazın..."
          disabled={!isConnected}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "20px",
            fontSize: 15,
            outline: "none",
            marginRight: 8,
            background: "#fff",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && message && isConnected) sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!isConnected || (!message && !selectedImage)}
          style={{
            background: "#38bdf8",
            color: "#fff",
            border: "none",
            borderRadius: "20px",
            padding: "10px 22px",
            fontWeight: "bold",
            fontSize: 15,
            cursor: isConnected && (message || selectedImage) ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
        >
          Gönder
        </button>
      </div>
      {!isConnected && <div style={{ color: "red", marginTop: 8 }}>Bağlantı kuruluyor...</div>}

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
                id="chat-image-upload-input"
              />
              <label htmlFor="chat-image-upload-input">
                <Box sx={{ 
                  cursor: "pointer",
                  p: 2,
                  "&:hover": { bgcolor: "rgba(56, 189, 248, 0.1)" },
                  borderRadius: 1
                }}>
                  <AttachFileIcon sx={{ fontSize: 48, color: "#38bdf8", mb: 1 }} />
                  <Typography variant="h6" color="primary">
                    Resim Seç
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Galeriden veya bilgisayarınızdan resim seçin
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Maksimum 5MB, JPG, PNG, GIF desteklenir
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
            sx={{ bgcolor: "#38bdf8" }}
          >
            {uploadingImage ? "Gönderiliyor..." : "Resmi Gönder"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resim Büyütme Modal'ı */}
      <Dialog
        open={isImageViewDialogOpen}
        onClose={closeImageViewDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgba(0,0,0,0.9)",
            borderRadius: "12px",
            overflow: "hidden"
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

          {/* Büyük Resim */}
          {selectedImageForView && (
            <img
              src={selectedImageForView}
              alt="Büyük resim"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: "8px"
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
