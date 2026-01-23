// Country to Currency mapping
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'India': 'INR',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  'United Arab Emirates': 'AED',
  'Singapore': 'SGD',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'Germany': 'EUR',
  'France': 'EUR',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Belgium': 'EUR',
  'Austria': 'EUR',
  'Portugal': 'EUR',
  'Ireland': 'EUR',
  'Japan': 'JPY',
  'China': 'CNY',
  'Hong Kong': 'HKD',
  'South Korea': 'KRW',
  'Malaysia': 'MYR',
  'Thailand': 'THB',
  'Indonesia': 'IDR',
  'Philippines': 'PHP',
  'Vietnam': 'VND',
  'New Zealand': 'NZD',
  'Switzerland': 'CHF',
  'Sweden': 'SEK',
  'Norway': 'NOK',
  'Denmark': 'DKK',
  'Poland': 'PLN',
  'Czech Republic': 'CZK',
  'Hungary': 'HUF',
  'Romania': 'RON',
  'Bulgaria': 'BGN',
  'Croatia': 'EUR',
  'Saudi Arabia': 'SAR',
  'Kuwait': 'KWD',
  'Qatar': 'QAR',
  'Bahrain': 'BHD',
  'Oman': 'OMR',
  'Israel': 'ILS',
  'Turkey': 'TRY',
  'South Africa': 'ZAR',
  'Egypt': 'EGP',
  'Nigeria': 'NGN',
  'Kenya': 'KES',
  'Brazil': 'BRL',
  'Mexico': 'MXN',
  'Argentina': 'ARS',
  'Chile': 'CLP',
  'Colombia': 'COP',
  'Peru': 'PEN',
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
  'SGD': 'S$',
  'AUD': 'A$',
  'CAD': 'C$',
  'JPY': '¥',
  'CNY': '¥',
  'HKD': 'HK$',
  'KRW': '₩',
  'MYR': 'RM',
  'THB': '฿',
  'IDR': 'Rp',
  'PHP': '₱',
  'VND': '₫',
  'NZD': 'NZ$',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'CZK': 'Kč',
  'HUF': 'Ft',
  'RON': 'lei',
  'BGN': 'лв',
  'SAR': 'ر.س',
  'KWD': 'د.ك',
  'QAR': 'ر.ق',
  'BHD': 'د.ب',
  'OMR': 'ر.ع',
  'ILS': '₪',
  'TRY': '₺',
  'ZAR': 'R',
  'EGP': 'E£',
  'NGN': '₦',
  'KES': 'KSh',
  'BRL': 'R$',
  'MXN': 'Mex$',
  'ARS': '$',
  'CLP': '$',
  'COP': '$',
  'PEN': 'S/',
};

// Currency names
export const CURRENCY_NAMES: Record<string, string> = {
  'INR': 'Indian Rupee',
  'USD': 'US Dollar',
  'EUR': 'Euro',
  'GBP': 'British Pound',
  'AED': 'UAE Dirham',
  'SGD': 'Singapore Dollar',
  'AUD': 'Australian Dollar',
  'CAD': 'Canadian Dollar',
  'JPY': 'Japanese Yen',
  'CNY': 'Chinese Yuan',
  'HKD': 'Hong Kong Dollar',
  'KRW': 'South Korean Won',
  'MYR': 'Malaysian Ringgit',
  'THB': 'Thai Baht',
  'IDR': 'Indonesian Rupiah',
  'PHP': 'Philippine Peso',
  'VND': 'Vietnamese Dong',
  'NZD': 'New Zealand Dollar',
  'CHF': 'Swiss Franc',
  'SEK': 'Swedish Krona',
  'NOK': 'Norwegian Krone',
  'DKK': 'Danish Krone',
  'PLN': 'Polish Zloty',
  'CZK': 'Czech Koruna',
  'HUF': 'Hungarian Forint',
  'RON': 'Romanian Leu',
  'BGN': 'Bulgarian Lev',
  'SAR': 'Saudi Riyal',
  'KWD': 'Kuwaiti Dinar',
  'QAR': 'Qatari Riyal',
  'BHD': 'Bahraini Dinar',
  'OMR': 'Omani Rial',
  'ILS': 'Israeli Shekel',
  'TRY': 'Turkish Lira',
  'ZAR': 'South African Rand',
  'EGP': 'Egyptian Pound',
  'NGN': 'Nigerian Naira',
  'KES': 'Kenyan Shilling',
  'BRL': 'Brazilian Real',
  'MXN': 'Mexican Peso',
  'ARS': 'Argentine Peso',
  'CLP': 'Chilean Peso',
  'COP': 'Colombian Peso',
  'PEN': 'Peruvian Sol',
};

// Detect country from IP using ipapi.co (free, no API key needed)
export const detectCountryFromIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country || 'IN'; // Use ISO code (country field, not country_name)
  } catch (error) {
    console.error('IP detection failed:', error);
    return 'IN'; // Default fallback to ISO code
  }
};

// Get currency for a country
export const getCurrencyForCountry = (country: string): string => {
  return COUNTRY_TO_CURRENCY[country] || 'INR';
};

// Get currency symbol
export const getCurrencySymbol = (currency: string): string => {
  return CURRENCY_SYMBOLS[currency] || currency;
};

// Get currency name
export const getCurrencyName = (currency: string): string => {
  return CURRENCY_NAMES[currency] || currency;
};

// Format amount with currency
export const formatCurrency = (amount: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
};

// Convert currency using live exchange rates
let exchangeRatesCache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;

  try {
    // Check cache
    const now = Date.now();
    if (exchangeRatesCache && (now - exchangeRatesCache.timestamp) < CACHE_DURATION) {
      const rate = exchangeRatesCache.rates[toCurrency];
      if (rate) return amount * rate;
    }

    // Fetch fresh rates from INR base
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    if (!response.ok) throw new Error('Exchange rate API failed');
    
    const data = await response.json();
    
    // Cache the rates
    exchangeRatesCache = {
      rates: data.rates,
      timestamp: now
    };

    const rate = data.rates[toCurrency];
    if (!rate) throw new Error(`Exchange rate not found for ${toCurrency}`);
    
    return amount * rate;
  } catch (error) {
    console.error('Currency conversion failed:', error);
    // Fallback to approximate rates if API fails
    const fallbackRates: Record<string, number> = {
      'INR': 1,
      'USD': 0.012,
      'EUR': 0.011,
      'GBP': 0.0095,
      'AED': 0.044,
      'SGD': 0.016,
      'AUD': 0.018,
      'CAD': 0.016,
    };
    
    if (fromCurrency === 'INR' && fallbackRates[toCurrency]) {
      return amount * fallbackRates[toCurrency];
    }
    
    // If all else fails, return original amount
    return amount;
  }
};
