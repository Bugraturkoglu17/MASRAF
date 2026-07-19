import type {
  ExpenseStatus,
  PermissionAction,
  PermissionResource,
  SystemRole,
  UserStatus,
} from './enums';

interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  isActive: boolean;
}

export interface Department extends BaseEntity {
  organizationId: string;
  name: string;
  isActive: boolean;
}

export interface User extends BaseEntity {
  organizationId: string;
  departmentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
}

export interface Role extends BaseEntity {
  organizationId: string | null;
  name: SystemRole | string;
  description: string | null;
  isSystem: boolean;
}

export interface Permission {
  id: string;
  action: PermissionAction;
  resource: PermissionResource;
}

export interface ExpenseCategory extends BaseEntity {
  organizationId: string;
  name: string;
  isActive: boolean;
}

export interface Expense extends BaseEntity {
  organizationId: string;
  departmentId: string | null;
  userId: string;
  categoryId: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  expenseDate: string;
  documentDate: string | null;
  status: ExpenseStatus;
  currentApprovalOrder: number;
  rejectionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  deletedAt: string | null;
}

export interface Attachment extends BaseEntity {
  organizationId: string;
  expenseId: string | null;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}
