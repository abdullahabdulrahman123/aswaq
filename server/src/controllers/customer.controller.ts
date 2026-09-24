import type { Request, Response } from 'express';
import type { Customer } from '@prisma/client';
import { customerSchema } from '../schemas/customer.schema.js';
import { createCustomer, listCustomers } from '../services/customer.service.js';

function toCustomerView(customer: Customer) {
  return { id: customer.id, name: customer.name, phone: customer.phone, isTrader: customer.isTrader };
}

export async function list(req: Request, res: Response) {
  const customers = await listCustomers(req.business!.accountId);
  res.json({ customers: customers.map(toCustomerView) });
}

export async function create(req: Request, res: Response) {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  const customer = await createCustomer(req.business!.accountId, parsed.data);
  res.status(201).json({ customer: toCustomerView(customer) });
}
