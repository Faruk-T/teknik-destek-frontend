import React from 'react';
import { 
  Dialog, DialogContent, Box, Typography, Avatar, IconButton, 
  Grid, Chip, Divider, Fade 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import BadgeIcon from '@mui/icons-material/Badge';
import SecurityIcon from '@mui/icons-material/Security';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />;
});

const ProfileItem = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <Box sx={{ 
      mr: 2, 
      bgcolor: '#f3f4f6', 
      p: 1, 
      borderRadius: '12px',
      color: '#667eea'
    }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight="600" color="textPrimary">
        {value || '-'}
      </Typography>
    </Box>
  </Box>
);

const ProfileDialog = ({ open, onClose, user }) => {
  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      {/* Üst Kısım: Gradyan Arka Plan ve Avatar */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        pt: 4, pb: 6, px: 3, 
        position: 'relative',
        color: 'white',
        textAlign: 'center'
      }}>
        <IconButton 
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
        >
          <CloseIcon />
        </IconButton>
        
        <Avatar 
          sx={{ 
            width: 96, height: 96, 
            bgcolor: 'white', 
            color: '#764ba2', 
            fontSize: '2.5rem',
            fontWeight: 'bold',
            border: '4px solid rgba(255,255,255,0.3)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            margin: '0 auto',
            mb: 2
          }}
        >
          {user.adSoyad?.charAt(0)}
        </Avatar>
        
        <Typography variant="h5" fontWeight="bold">
          {user.adSoyad}
        </Typography>
        <Chip 
          label={user.rol === 'yonetici' ? 'Sistem Yöneticisi' : 'Müşteri Hesabı'} 
          size="small" 
          sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} 
        />
      </Box>

      {/* Alt Kısım: Detaylar */}
      <DialogContent sx={{ p: 4 }}>
        <Grid container direction="column" spacing={1}>
            <ProfileItem 
                icon={<BadgeIcon />} 
                label="Ad Soyad" 
                value={user.adSoyad} 
            />
            <Divider sx={{ my: 1, opacity: 0.5 }} />
            
            <ProfileItem 
                icon={<AlternateEmailIcon />} 
                label="Kullanıcı Adı" 
                value={user.kullaniciAdi} 
            />
            <Divider sx={{ my: 1, opacity: 0.5 }} />
            
            <ProfileItem 
                icon={<BusinessIcon />} 
                label="Şirket / Kurum" 
                value={user.sirketAdi} 
            />
            <Divider sx={{ my: 1, opacity: 0.5 }} />
            
            <ProfileItem 
                icon={<SecurityIcon />} 
                label="Yetki Seviyesi" 
                value={user.rol?.toUpperCase()} 
            />
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;