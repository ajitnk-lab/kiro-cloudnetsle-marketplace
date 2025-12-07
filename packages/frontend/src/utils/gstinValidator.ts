export const validateGSTIN = (gstin: string): boolean => {
  if (!gstin || gstin.length !== 15) return false;
  
  // First 2 digits: State code (01-37)
  const stateCode = parseInt(gstin.substring(0, 2));
  if (stateCode < 1 || stateCode > 37) return false;
  
  // Next 10 chars: PAN format (5 letters, 4 digits, 1 letter)
  const panPart = gstin.substring(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(panPart)) return false;
  
  // 13th char: Entity number (1-9, A-Z)
  const entityChar = gstin.charAt(12);
  if (!/^[1-9A-Z]$/.test(entityChar)) return false;
  
  // 14th char: Z (default)
  if (gstin.charAt(13) !== 'Z') return false;
  
  // 15th char: Check digit (0-9, A-Z)
  const checkDigit = gstin.charAt(14);
  if (!/^[0-9A-Z]$/.test(checkDigit)) return false;
  
  return true;
};
