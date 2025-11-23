import React, { useState, useRef, useCallback, useEffect } from "react";
import Chat from "./Chat";

function ChatWithToggle(props) {
  const { senderId, receiverId, ticketId, onNewMessage, hasNewMessage: propsHasNewMessage } = props;
  const [open, setOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const chatRef = useRef();

  // open state'inin güncel değerini ref ile takip et
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Props'tan gelen bildirim durumunu takip et
  useEffect(() => {
    if (propsHasNewMessage && !open) {
      console.log("ChatWithToggle: Yeni mesaj bildirimi alındı, badge gösteriliyor");
      setHasNewMessage(true);
    }
  }, [propsHasNewMessage, open]);

  // Responsive panel genişliği ve stilini belirle
  const getPanelStyle = () => {
    const isMobile = window.innerWidth < 600;
    return {
      position: "absolute",
      bottom: isMobile ? 0 : 60,
      right: isMobile ? 0 : 0,
      left: isMobile ? 0 : undefined,
      width: isMobile ? "100vw" : 370,
      minWidth: isMobile ? "100vw" : 250,
      maxWidth: isMobile ? "100vw" : 370,
      background: "#fff",
      border: isMobile ? "none" : "1px solid #ccc",
      borderRadius: isMobile ? 0 : 12,
      boxShadow: isMobile ? "0 -2px 20px #0003" : "0 2px 12px #0002",
      zIndex: 1001,
      padding: 0,
      height: isMobile ? "90vh" : undefined,
      maxHeight: isMobile ? "90vh" : undefined,
      display: "flex",
      flexDirection: "column"
    };
  };

  // Yeni mesaj geldiğinde çağrılır
  const handleNewMessage = useCallback(() => {
    console.log("ChatWithToggle: handleNewMessage çağrıldı");
    setHasNewMessage((prev) => {
      if (!openRef.current && !prev) {
        console.log("ChatWithToggle: Bildirim badge'i gösteriliyor");
        return true;
      }
      return prev;
    });
  }, []);

  // Mesaj gönderildiğinde karşı tarafa bildirim gönder
  const handleMessageSent = useCallback(() => {
    console.log("ChatWithToggle: handleMessageSent çağrıldı");
    // Karşı tarafın chat paneli kapalıysa bildirim göster
    if (onNewMessage) {
      onNewMessage();
    }
  }, [onNewMessage]);

  // Panel açılınca bildirimi sıfırla
  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev) {
        console.log("ChatWithToggle: Panel açılıyor, bildirimler sıfırlanıyor");
        setHasNewMessage(false);
        // Ana bileşendeki bildirimi de sıfırla - useEffect ile yap
        return true;
      }
      return false;
    });
  };

  // Panel açıldığında bildirimleri sıfırla
  useEffect(() => {
    if (open && onNewMessage) {
      console.log("ChatWithToggle: Panel açıldı, bildirimler sıfırlanıyor");
      onNewMessage();
    }
  }, [open, onNewMessage]);

  // Kullanıcı yoksa hiçbir şey gösterme
  if (!senderId || !receiverId) return null;

  // Mobil kontrolü
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  return (
    <div style={{ position: "fixed", bottom: isMobile ? 0 : 20, right: isMobile ? 0 : 20, left: isMobile ? 0 : undefined, zIndex: 1000, maxWidth: "100vw" }}>
      <button
        onClick={handleToggle}
        disabled={!ticketId}
        style={{
          background: ticketId ? "#38bdf8" : "#b0bfc7",
          color: "#fff",
          border: "none",
          borderRadius: "20px",
          padding: "12px 28px",
          fontWeight: "bold",
          fontSize: 17,
          cursor: ticketId ? "pointer" : "not-allowed",
          position: "relative",
          boxShadow: "0 2px 8px #0002",
          transition: "all 0.3s ease"
        }}
        title={!ticketId ? "Lütfen bir şikayet seçin" : ""}
        onMouseEnter={(e) => {
          if (ticketId) {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 16px #0003";
          }
        }}
        onMouseLeave={(e) => {
          if (ticketId) {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 2px 8px #0002";
          }
        }}
      >
        Mesajlar
        {hasNewMessage && ticketId && (
          <span style={{
            position: "absolute",
            top: 6,
            right: 10,
            background: "#ef4444",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
            fontSize: 12,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            animation: "pulse 2s infinite"
          }}>!</span>
        )}
      </button>
      
      {open && ticketId && (
        <div style={getPanelStyle()}>
          {/* Mobil için kapatma butonu */}
          {isMobile && (
            <button
              onClick={handleToggle}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 1002,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                transition: "all 0.3s ease"
              }}
              title="Kapat"
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.1)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
              }}
            >
              ✕
            </button>
          )}
          
          <Chat
            senderId={senderId}
            receiverId={receiverId}
            ticketId={ticketId}
            token={props.token}
            onNewMessage={handleNewMessage}
            onMessageSent={handleMessageSent}
            ref={chatRef}
          />
        </div>
      )}
    </div>
  );
}

export default ChatWithToggle; 