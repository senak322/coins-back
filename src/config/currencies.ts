export interface ICurrency {
    symbol: string;
    decimalPlaces: number;
  }
  
  export const currencies: ICurrency[] = [
    { symbol: "RUB", decimalPlaces: 0 },
    { symbol: "BTC", decimalPlaces: 8 },
    { symbol: "ETH", decimalPlaces: 8 },
    { symbol: "USDT", decimalPlaces: 2 },
    { symbol: "TON", decimalPlaces: 4 },
    { symbol: "XMR", decimalPlaces: 4 },
    { symbol: "TRX", decimalPlaces: 2 },
    { symbol: "DOGE", decimalPlaces: 2 },
    { symbol: "USDC", decimalPlaces: 2 },
    { symbol: "LTC", decimalPlaces: 8 },
    { symbol: "SOL", decimalPlaces: 4 },
    { symbol: "DAI", decimalPlaces: 2 },
    { symbol: "ADA", decimalPlaces: 2 },
    // Добавьте другие валюты по необходимости
  ];