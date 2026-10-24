export interface Client {
  id: string; businessName: string; ownerName: string; phone: string; email?: string;
  address?: string; googleMapsUrl?: string;
  contractType: 'one-time' | 'retainer' | 'hybrid';
  servicesTaken: string[];
  status: 'lead' | 'active' | 'completed' | 'cancelled';
  oneTimeFee: number; retainerAmountMonthly: number;
  domainName?: string; domainExpiryDate?: string;
  hostingProvider?: string; hostingExpiryDate?: string;
  notes?: string; createdAt: string; updatedAt: string;
}
export interface IncomeRecord {
  id: string; clientId: string; clientName: string; projectId?: string; amount: number;
  paymentType: 'advance' | 'final_balance' | 'retainer';
  paymentMethod: 'Online' | 'Cash'; date: string; notes?: string; createdAt: string;
}
export interface ExpenseRecord {
  id: string; title: string;
  category: 'domain_hosting' | 'software_subscription' | 'transport_marketing' | 'contractor_payout' | 'hardware_rd' | 'miscellaneous';
  amount: number; clientId?: string; projectId?: string; vendorName: string; date: string; notes?: string; createdAt: string;
}
export interface Note {
  id: string; title: string; content: string; createdAt: string; updatedAt: string;
}
export interface ChecklistItem { id: string; text: string; done: boolean; }
export type ProjectStatus = 'active' | 'on_hold' | 'completed';
export interface Project {
  id: string; name: string; clientId: string; clientName: string; service: string;
  status: ProjectStatus;
  startDate?: string; deadline: string;   // deadline = ISO date-time
  budget: number;                          // agreed price for this project (INR)
  estimatedHours?: number;                 // total work hours estimated
  checklist: ChecklistItem[];              // progress % = done items / total items
  notes?: string; createdAt: string; updatedAt: string;
}
export type CollectionName = 'clients' | 'income' | 'expenses' | 'notes' | 'projects';
