const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

let backendProcess = null;

function startBackend() {
  // Backend'i başlat
  let backendPath;
  
  // Geliştirme ortamında
  if (app.isPackaged === false) {
    backendPath = path.join(__dirname, '..', 'source', 'repos', 'DestekAPI', 'DestekAPI', 'bin', 'Debug', 'net8.0', 'DestekAPI.exe');
  } 
  // Paketlenmiş uygulamada
  else {
    backendPath = path.join(process.resourcesPath, 'backend', 'DestekAPI.exe');
  }
  
  console.log('Backend başlatılıyor:', backendPath);
  
  backendProcess = spawn(backendPath, [], {
    stdio: 'pipe',
    detached: false
  });

  backendProcess.stdout.on('data', (data) => {
    console.log('Backend:', data.toString());
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('Backend Error:', data.toString());
  });

  backendProcess.on('close', (code) => {
    console.log('Backend kapandı, kod:', code);
    if (code !== 0 && code !== null) {
      dialog.showErrorBox('Backend Hatası', 'Backend başlatılamadı. Lütfen uygulamayı yeniden başlatın veya yöneticinize başvurun.');
    }
  });
  
  backendProcess.on('error', (err) => {
    console.error('Backend başlatma hatası:', err);
    dialog.showErrorBox('Backend Hatası', `Backend başlatılamadı: ${err.message}`);
  });
}

function createWindow () {
  // Platform'a göre icon seç
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'public', 'icon.ico'); // Windows için .ico
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'public', 'icon.icns'); // macOS için .icns
  } else {
    iconPath = path.join(__dirname, 'public', 'icon.png'); // Linux için .png
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    title: 'TREND TEKNOLOJİ - Destek Sistemi',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'build', 'index.html'));
}

// Backend'in hazır olup olmadığını kontrol et
function checkBackendReady(retries = 0, maxRetries = 10) {
  if (retries >= maxRetries) {
    dialog.showErrorBox('Bağlantı Hatası', 'Backend sunucusuna bağlanılamadı. Lütfen uygulamayı yeniden başlatın.');
    return;
  }

  fetch('http://192.168.1.72:5106/api/health')
    .then(response => {
      if (response.ok) {
        console.log('Backend hazır, pencere açılıyor...');
        createWindow();
      } else {
        console.log(`Backend henüz hazır değil, ${retries + 1}/${maxRetries} deneme...`);
        setTimeout(() => checkBackendReady(retries + 1, maxRetries), 1000);
      }
    })
    .catch(error => {
      console.log(`Backend henüz hazır değil, ${retries + 1}/${maxRetries} deneme...`);
      setTimeout(() => checkBackendReady(retries + 1, maxRetries), 1000);
    });
}

app.whenReady().then(() => {
  // Backend'i başlat
  startBackend();
  
  // Backend'in hazır olmasını bekle ve pencereyi aç
  setTimeout(() => {
    checkBackendReady();
  }, 2000);
});

app.on('window-all-closed', () => {
  // Backend'i kapat
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});