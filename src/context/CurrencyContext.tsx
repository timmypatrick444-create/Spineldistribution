import React, { createContext, useContext, useState, useEffect } from 'react';
import { ServerConfig } from '../types';

interface CurrencyContextType {
  currency: 'USD' | 'NGN';
  setCurrency: (c: 'USD' | 'NGN') => void;
  exchangeRate: number; // 1 USD in NGN
  formatPrice: (priceUSD: number, targetCurrency?: 'USD' | 'NGN') => string;
  convertToNGN: (priceUSD: number) => number;
  serverConfig: ServerConfig | null;
  refreshConfig: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<'USD' | 'NGN'>(() => {
    return (localStorage.getItem('spinel_currency') as 'USD' | 'NGN') || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState<number>(1580);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  const refreshConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data: ServerConfig = await res.json();
        setServerConfig(data);
        if (data.usdToNgnRate && !isNaN(data.usdToNgnRate)) {
          setExchangeRate(data.usdToNgnRate);
        }
      }
    } catch (err) {
      console.warn('[Currency] Failed to fetch server config, using fallback rate', err);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const handleSetCurrency = (c: 'USD' | 'NGN') => {
    setCurrency(c);
    localStorage.setItem('spinel_currency', c);
  };

  const convertToNGN = (priceUSD: number): number => {
    return Math.round(priceUSD * exchangeRate);
  };

  const formatPrice = (priceUSD: number, targetCurrency?: 'USD' | 'NGN'): string => {
    const activeCurr = targetCurrency || currency;
    if (activeCurr === 'NGN') {
      const ngnAmount = convertToNGN(priceUSD);
      return `₦${ngnAmount.toLocaleString('en-NG')}`;
    }
    return `$${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        exchangeRate,
        formatPrice,
        convertToNGN,
        serverConfig,
        refreshConfig
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
