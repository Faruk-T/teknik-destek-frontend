import React, { useState } from 'react';
import { 
  Box, Drawer, AppBar, Toolbar, Typography, Avatar, IconButton, 
  Container, Button, useTheme, useMediaQuery, List, ListItem, 
  ListItemIcon, ListItemText, ListItemButton, Divider 
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import ProfileDialog from './ProfileDialog'; // Profil bileşenini ekledik

const drawerWidth = 280;

const DashboardLayout = ({ children, title, user, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // Profil penceresi için state

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Profil açma fonksiyonu
  const handleOpenProfile = () => {
    setProfileOpen(true);
  };

  // Sidebar İçeriği (Gradient Arka Planlı)
  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: 2
    }}>
      <Box>
        {/* Logo Alanı */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, mt: 2, px: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <SupportAgentIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1, letterSpacing: 0.5 }}>
              DestekPro
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              v1.0 Panel
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 3 }} />

        {/* Menü Linkleri */}
        <List>
            <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                    <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                        <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Genel Bakış" primaryTypographyProps={{ fontWeight: 'medium' }} />
                </ListItemButton>
            </ListItem>
            
            {/* Profilim Butonu - Artık Tıklanabilir! */}
            <ListItem disablePadding>
                <ListItemButton onClick={handleOpenProfile} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                        <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="Profilim" sx={{ opacity: 0.8 }} />
                </ListItemButton>
            </ListItem>
        </List>
      </Box>

      {/* Alt Kısım: Kullanıcı ve Çıkış */}
      <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3, p: 2, backdropFilter: 'blur(10px)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'white', color: '#764ba2', fontWeight: 'bold' }}>
                {user?.adSoyad?.charAt(0)}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="subtitle2" fontWeight="bold" noWrap>{user?.adSoyad}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }} noWrap>
                    {user?.rol === 'yonetici' ? 'Yönetici' : user?.sirketAdi}
                </Typography>
            </Box>
          </Box>
          <Button 
            fullWidth 
            onClick={onLogout}
            startIcon={<LogoutIcon />} 
            size="small"
            sx={{ 
                color: 'white', 
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: '#ef4444', color: 'white' },
                justifyContent: 'flex-start',
                px: 2
            }}
          >
            Güvenli Çıkış
          </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6f8' }}>
      
      {/* Mobil Üst Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderBottom: '1px solid #e0e0e0',
          color: '#1e293b'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar (Drawer) */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobil Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', boxShadow: '4px 0 24px rgba(0,0,0,0.05)' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Ana İçerik Alanı */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8, // AppBar yüksekliği
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Container maxWidth="xl" disableGutters>
            {children}
        </Container>
      </Box>

      {/* Profil Dialog Bileşeni */}
      <ProfileDialog 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)} 
        user={user} 
      />
    </Box>
  );
};

export default DashboardLayout;