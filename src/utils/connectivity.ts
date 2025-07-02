/**
 * Utilitaires de connectivité pour détecter les problèmes réseau
 */
import { useState, useEffect } from 'react';

export const checkConnectivity = async (): Promise<boolean> => {
  try {
    // Test simple de connectivité
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    });
    return true;
  } catch (error) {
    console.warn('Connectivité limitée détectée:', error);
    return false;
  }
};

export const waitForConnectivity = async (maxAttempts = 5): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    const isConnected = await checkConnectivity();
    if (isConnected) {
      return true;
    }
    
    // Attendre progressivement plus longtemps
    const delay = Math.min(1000 * Math.pow(2, i), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return false;
};

export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const useConnectivity = () => {
  const [isConnected, setIsConnected] = useState(navigator.onLine);

  useEffect(() => {
    const updateConnectivity = () => {
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);

    return () => {
      window.removeEventListener('online', updateConnectivity);
      window.removeEventListener('offline', updateConnectivity);
    };
  }, []);

  return isConnected;
};