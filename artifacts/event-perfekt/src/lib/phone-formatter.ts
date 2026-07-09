export function formatNigerianPhone(phone: string | null | undefined): { display: string; tel: string } | null {
  if (!phone) return null;
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('234')) {
    // Already has country code: 234XXXXXXXXXX -> +234 XXX XXX XXXX
    cleaned = cleaned.substring(1); // Remove leading 2
  }
  
  if (cleaned.startsWith('0')) {
    // Remove leading 0: 0XXXXXXXXXX -> XXXXXXXXXX
    cleaned = cleaned.substring(1);
  }
  
  // Now we have 10 digits: format as +234 XXX XXX XXXX
  if (cleaned.length === 10) {
    return {
      display: `+234 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`,
      tel: `+234${cleaned}`
    };
  }
  
  // Fallback
  return { display: phone, tel: `tel:${phone}` };
}
