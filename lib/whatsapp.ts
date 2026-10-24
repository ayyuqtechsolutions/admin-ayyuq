import type { Client } from '@/types';
export const TEMPLATES: Record<string, (c: Client) => string> = {
  greeting: (c) => `Hi ${c.ownerName}, this is Ayyuq Tech Solutions. Hope things are going well at ${c.businessName}!`,
  payment: (c) => `Hi ${c.ownerName}, a gentle reminder about the pending payment for ${c.businessName}. Thank you!`,
  renewal: (c) => `Hi ${c.ownerName}, your domain/hosting for ${c.businessName} is due for renewal soon. Shall we proceed?`,
};
export const wa = (c: Client, t: string) =>
  `https://web.whatsapp.com/send?phone=${c.phone.replace(/\D/g, '')}&text=${encodeURIComponent(TEMPLATES[t](c))}`;
