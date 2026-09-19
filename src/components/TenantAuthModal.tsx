import React from 'react';
import { NestInAuthModal } from './NestInAuthModal';

interface TenantAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export const TenantAuthModal: React.FC<TenantAuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  return <NestInAuthModal isOpen={isOpen} onClose={onClose} initialRole="tenant" initialTab={initialTab} />;
};
