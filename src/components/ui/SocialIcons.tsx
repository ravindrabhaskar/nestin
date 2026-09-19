import React from 'react';

// Official WhatsApp Brand Logo from original WhatsApp assets
export const WhatsAppLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c0-5.445 4.43-9.874 9.877-9.874 2.637 0 5.116 1.028 6.98 2.894a9.81 9.81 0 012.89 6.98c0 5.447-4.43 9.877-9.877 9.877m0-18.067C6.012 3.718 1.15 8.58 1.15 14.586c0 2.01.554 3.974 1.603 5.694L1 26l5.867-1.538a10.82 10.82 0 005.183 1.325h.005c6.002 0 10.865-4.863 10.865-10.868 0-2.903-1.13-5.632-3.183-7.684a10.79 10.79 0 00-7.686-3.183" />
      </svg>
    );
  }
  return (
    <img
      src="https://static.whatsapp.net/rsrc.php/v4/yO/r/rukeqTVNJDY.png"
      alt="WhatsApp"
      className={`object-contain rounded-full ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  );
};

// Official Telegram Brand Logo
export const TelegramLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.762-.17.712-.433.951-.687.974-.558.051-.982-.369-1.523-.723-.846-.554-1.324-.898-2.147-1.44-.951-.626-.335-.97.208-1.534.142-.147 2.607-2.39 2.655-2.593.006-.025.01-.12-.045-.169-.056-.049-.138-.032-.198-.019-.084.019-1.428.908-4.032 2.668-.381.262-.727.39-.1.037-.417-.914-.23-1.609-.379-2.392-.53-.88-.17-1.597-.367-1.538-.797.03-.223.336-.452.922-.686 3.614-1.572 6.026-2.609 7.236-3.11 3.447-1.428 4.162-1.677 4.628-1.685.103-.002.333.023.483.145.126.103.161.242.178.341.016.1.036.326.02.503z" />
      </svg>
    );
  }
  return (
    <img
      src="https://static.vecteezy.com/system/resources/previews/016/716/472/original/telegram-icon-free-png.png"
      alt="Telegram"
      className={`object-contain rounded-full ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  );
};

// Official Facebook Brand Logo
export const FacebookLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  return (
    <img
      src="https://vectorseek.com/wp-content/uploads/2023/06/Facebook-blue-icon-Vector.jpg"
      alt="Facebook"
      className={`object-contain rounded-full ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  );
};

// Official Google Gmail 4-Color Logo
export const GmailLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M1.5 19.5v-13l9 6.75-9 6.25z" />
        <path fill="#34A853" d="M22.5 19.5v-13l-9 6.75 9 6.25z" />
        <path
          fill="#EA4335"
          d="M22.5 6.5l-10.5 7.875L1.5 6.5V4.5C1.5 3.395 2.395 2.5 3.5 2.5h17c1.105 0 2 .895 2 2v2z"
        />
        <path fill="#FBBC04" d="M1.5 19.5h21v2c0 1.105-.895 2-2 2h-17c-1.105 0-2-.895-2-2v-2z" />
      </svg>
    );
  }
  return (
    <img
      src="https://static.vecteezy.com/system/resources/previews/022/484/516/original/google-mail-gmail-icon-logo-symbol-free-png.png"
      alt="Gmail"
      className={`object-contain ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  );
};

// Official Google 4-Color Logo
export const GoogleGLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

// Official Google Maps Pin Logo
export const GoogleMapsPinIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle fill="#FFFFFF" cx="12" cy="9" r="2.5" />
  </svg>
);

// Alias for backwards compatibility
export const RealisticEmailIcon = GmailLogoIcon;
