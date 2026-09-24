import { prisma } from '../config/db.js';
import type { CustomerInput } from '../schemas/customer.schema.js';

/** عملاء النشاط بالاسم — الكومبو بيدوّر فيهم على الجهاز */
export function listCustomers(accountId: string) {
  return prisma.customer.findMany({ where: { accountId }, orderBy: { name: 'asc' } });
}

export function createCustomer(accountId: string, input: CustomerInput) {
  return prisma.customer.create({ data: { accountId, ...input } });
}
