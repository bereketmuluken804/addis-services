import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Convert +251911223344 to +251 91 122 3344
  if (phone.startsWith('+251') && phone.length === 13) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  return phone;
}
