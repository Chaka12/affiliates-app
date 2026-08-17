// Shared TypeScript types for the Remedial School Affiliate app

export type Role = 'agent' | 'admin'
export type AgentStatus = 'Active' | 'Inactive'
export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid'
export type PaymentMethod = 'M-Pesa' | 'EcoCash' | 'Cash' | 'Bank Transfer'

export interface User {
  id: number
  agentId: string
  name: string
  email: string
  phone: string
  role: Role
  commissionRate: number
  status: AgentStatus
}

export interface SubjectItem {
  id: number
  name: string
  price: number
  isActive: boolean
  sortOrder: number
}

export interface AgentProfile extends User {
  createdAt: string
  defaultSubjectPrice: number
  estimatedCommissionPerSubject: number
}

export interface Claim {
  id: number
  claimId: string
  agentId?: number
  agentName: string
  agentEmail: string
  parentFullName: string
  parentPhone: string
  parentEmail: string | null
  studentName: string
  studentGrade: string
  studentSchool: string | null
  subjects: string
  subjectCount: number
  totalStudentFee: number
  notes: string | null
  status: ClaimStatus
  commissionAmount: number
  startDate: string | null
  thirtyDayCheckpoint: string | null
  paymentMethod: PaymentMethod | null
  datePaid: string | null
  adminNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentListItem {
  id: number
  agentId: string
  fullName: string
  email: string
  phone: string
  commissionRate: number
  status: AgentStatus
  role: Role
  createdAt: string
}

export interface AdminStats {
  totalAgents: number
  activeAgents: number
  inactiveAgents: number
  totalClaims: number
  pendingClaims: number
  approvedClaims: number
  paidClaims: number
  rejectedClaims: number
  totalCommissionPaid: number
  totalCommissionAccrued: number
  totalStudentFees: number
}

export type ScreenName =
  | 'login'
  | 'agent-dashboard'
  | 'new-claim'
  | 'my-claims'
  | 'claim-detail'
  | 'admin-dashboard'
  | 'admin-claims'
  | 'admin-agents'
  | 'admin-subjects'

export const VALID_GRADES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
]

export const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'M-Pesa',
  'EcoCash',
  'Cash',
  'Bank Transfer',
]

export const CLAIM_STATUSES: ClaimStatus[] = [
  'Pending',
  'Approved',
  'Rejected',
  'Paid',
]
