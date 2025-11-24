import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Typography, TextField, Button, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Chip, Alert, 
  FormControlLabel, Switch, CircularProgress
} from "@mui/material";
import * as signalR from "@microsoft/signalr";

import { API_BASE_URL } from './config';

function MusteriPaneli({ token, kullaniciId, kullanici }) {
  const [sikayetler, setSikayetler] = useState([]);
  const [yeniSikayet, setYeniSikayet] = useState({ konu: "", aciklama: "", alpemixIsteniyor: false });
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  // 1. Şikayetleri Getir (useCallback ile hafızaya alındı)
  const fetchSikayetler = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Sikayet/kullanici/${kullaniciId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSikayetler(data);
      }
    } catch (err) { console.error(err); }
  }, [kullaniciId, token]);

  // 2. SignalR Bağlantısını Kur
  useEffect(() => {
    fetchSikayetler();

    let connection = window.signalRConnection;

    if (!connection) {
        connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/chathub?userId=${kullaniciId}`, { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .build();
        connection.start().catch(err => console.error(err));
    }

    // ✅ İSİM HATASI DÜZELTİLDİ: 'handleDurumGuncelle' olarak tanımlandı
    const handleDurumGuncelle = (id, yeniDurum, cozum) => {
        setSikayetler(prev => prev.map(s => s.id === id ? { ...s, durum: yeniDurum, cozumAciklamasi: cozum } : s));
        if(yeniDurum === "Çözüldü") setMesaj("✅ Bir şikayetiniz çözüldü!");
        setTimeout(() => setMesaj(""), 4000);
    };

    const handleAtama = (id) => {
        setSikayetler(prev => prev.map(s => s.id === id ? { ...s, durum: "İşleniyor" } : s));
        setMesaj("ℹ️ Şikayetiniz işleme alındı.");
        setTimeout(() => setMesaj(""), 4000);
    };

    connection.on("SikayetDurumGuncellendi", handleDurumGuncelle);
    connection.on("SikayetAtandi", handleAtama);

    return () => {
        connection.off("SikayetDurumGuncellendi", handleDurumGuncelle);
        connection.off("SikayetAtandi", handleAtama);
    };
  }, [fetchSikayetler, kullaniciId, token]); // Bağımlılıklar eklendi

  const handleSikayetEkle = async (e) => {
    e.preventDefault();
    setMesaj("");
    setYukleniyor(true);
    try {
      const gonderilecekVeri = {
        kullaniciId: kullaniciId,
        konu: yeniSikayet.konu,
        aciklama: yeniSikayet.aciklama,
        alpemixIsteniyor: yeniSikayet.alpemixIsteniyor,
        alpemixKodu: "" 
      };
      const response = await fetch(`${API_BASE_URL}/api/Sikayet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(gonderilecekVeri)
      });
      if (response.ok) {
        setMesaj("✅ Şikayetiniz başarıyla oluşturuldu!");
        setYeniSikayet({ konu: "", aciklama: "", alpemixIsteniyor: false });
        fetchSikayetler(); 
      } else { setMesaj("❌ Hata oluştu."); }
    } catch (err) { setMesaj("Sunucu hatası!"); } 
    finally { setYukleniyor(false); setTimeout(() => setMesaj(""), 3000); }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2, borderLeft: '6px solid #667eea' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#4a5568' }}>➕ Yeni Destek Talebi</Typography>
        <Box component="form" onSubmit={handleSikayetEkle}>
          <TextField fullWidth label="Konu" value={yeniSikayet.konu} onChange={(e) => setYeniSikayet({ ...yeniSikayet, konu: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Açıklama" value={yeniSikayet.aciklama} onChange={(e) => setYeniSikayet({ ...yeniSikayet, aciklama: e.target.value })} margin="normal" required multiline rows={3} />
          <FormControlLabel control={<Switch checked={yeniSikayet.alpemixIsteniyor} onChange={(e) => setYeniSikayet({ ...yeniSikayet, alpemixIsteniyor: e.target.checked })} />} label="Uzaktan Bağlantı Gerekli mi?" sx={{ mt: 1 }} />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={yukleniyor}>{yukleniyor ? <CircularProgress size={24} /> : "Gönder"}</Button>
          {mesaj && <Alert severity="info" sx={{ mt: 2 }}>{mesaj}</Alert>}
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>📋 Taleplerim</Typography>
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: '#f7fafc' }}>
            <TableRow><TableCell>ID</TableCell><TableCell>Konu</TableCell><TableCell>Durum</TableCell><TableCell>Tarih</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {sikayetler.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>#{s.id}</TableCell>
                <TableCell>{s.konu}</TableCell>
                <TableCell><Chip label={s.durum} color={s.durum === "Çözüldü" ? "success" : "warning"} size="small" /></TableCell>
                <TableCell>{new Date(s.tarih).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
export default MusteriPaneli;