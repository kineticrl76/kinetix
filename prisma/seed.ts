import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@kinetix.app' },
    update: {},
    create: {
      id: 'demo-user-001',
      email: 'demo@kinetix.app',
      name: 'Demo User',
      base_currency: 'USD',
      tax_config: JSON.stringify([
        { tax_name: 'Federal Income Tax', effective_rate_percentage: 22, deduction_type: 'standard' },
        { tax_name: 'State Income Tax', effective_rate_percentage: 5, deduction_type: 'standard' },
      ]),
    },
  });

  await prisma.income.createMany({
    data: [
      { userId: user.id, source: 'Primary Salary', category: 'salary', amount: 7500, frequency: 'monthly', received_at: new Date() },
      { userId: user.id, source: 'Freelance', category: 'freelance', amount: 1200, frequency: 'monthly', received_at: new Date() },
    ],
  });

  await prisma.fixedLiability.createMany({
    data: [
      { userId: user.id, name: 'Health Insurance', category: 'insurance', amount: 450, billing_cycle: 'monthly', next_payment_date: new Date(Date.now() + 7 * 86400000) },
      { userId: user.id, name: 'Netflix', category: 'subscription', amount: 22.99, billing_cycle: 'monthly', next_payment_date: new Date(Date.now() + 14 * 86400000) },
      { userId: user.id, name: 'AWS', category: 'subscription', amount: 85, billing_cycle: 'monthly', next_payment_date: new Date(Date.now() + 5 * 86400000) },
      { userId: user.id, name: 'Car Insurance', category: 'insurance', amount: 180, billing_cycle: 'monthly', next_payment_date: new Date(Date.now() + 21 * 86400000) },
    ],
  });

  await prisma.savingsAccount.createMany({
    data: [
      { userId: user.id, name: 'Emergency Fund', institution: 'Chase Bank', account_type: 'savings', balance: 12500 },
      { userId: user.id, name: '401(k)', institution: 'Fidelity', account_type: 'retirement', balance: 48200 },
      { userId: user.id, name: 'Brokerage', institution: 'Robinhood', account_type: 'investment', balance: 9800 },
    ],
  });

  await prisma.financialGoal.createMany({
    data: [
      { userId: user.id, name: 'Japan Vacation', category: 'vacation', target_amount: 5000, current_amount: 1800, target_date: new Date('2025-12-01') },
      { userId: user.id, name: 'Home Down Payment', category: 'home', target_amount: 60000, current_amount: 12500, target_date: new Date('2027-06-01') },
      { userId: user.id, name: '6-Month Emergency Fund', category: 'emergency_fund', target_amount: 25000, current_amount: 12500, target_date: new Date('2025-12-31') },
    ],
  });

  console.log('Seed complete. Demo user:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
