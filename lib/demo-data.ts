import { prisma } from './db'
import { generateForecast } from './forecasting'
import { addDays, subDays, format } from 'date-fns'

// Generate realistic sample data for demo/testing
export async function generateDemoData(userId: string) {
  // Clear any existing demo data
  await prisma.transaction.deleteMany({
    where: { userId, source: 'demo' },
  })

  const transactions = []
  const today = new Date()

  // Generate 12 months of historical transactions
  for (let month = 0; month < 12; month++) {
    const monthDate = subDays(today, month * 30)

    // Monthly payroll (biggest expense)
    transactions.push({
      userId,
      externalId: `demo-payroll-${month}`,
      source: 'demo',
      date: subDays(monthDate, 25),
      amount: 4500000 + Math.floor(Math.random() * 50000), // £45,000 +/- £500
      type: 'expense',
      description: 'Monthly Payroll',
      category: 'payroll',
      contact: 'Staff',
    })

    // Rent (consistent)
    transactions.push({
      userId,
      externalId: `demo-rent-${month}`,
      source: 'demo',
      date: subDays(monthDate, 1),
      amount: 250000, // £2,500
      type: 'expense',
      description: 'Office Rent',
      category: 'rent',
      contact: 'Landlord Ltd',
    })

    // Software subscriptions
    transactions.push({
      userId,
      externalId: `demo-software-${month}`,
      source: 'demo',
      date: subDays(monthDate, 15),
      amount: 45000 + Math.floor(Math.random() * 5000), // £450 +/- £50
      type: 'expense',
      description: 'Software Subscriptions',
      category: 'software',
      contact: 'Various',
    })

    // Utilities
    transactions.push({
      userId,
      externalId: `demo-utilities-${month}`,
      source: 'demo',
      date: subDays(monthDate, 10),
      amount: 35000 + Math.floor(Math.random() * 10000), // £350 +/- £100
      type: 'expense',
      description: 'Utilities',
      category: 'utilities',
      contact: 'British Gas',
    })

    // Client invoices (income) - varying amounts
    const numInvoices = 3 + Math.floor(Math.random() * 3) // 3-5 invoices per month
    for (let i = 0; i < numInvoices; i++) {
      transactions.push({
        userId,
        externalId: `demo-invoice-${month}-${i}`,
        source: 'demo',
        date: subDays(monthDate, Math.floor(Math.random() * 28)),
        amount: 800000 + Math.floor(Math.random() * 400000), // £8,000 - £12,000
        type: 'income',
        description: `Invoice INV-${1000 + month * 10 + i}`,
        category: 'sales',
        contact: ['Acme Corp', 'TechStart Ltd', 'Global Solutions', 'Innovation Inc', 'Digital Agency'][i % 5],
      })
    }

    // Quarterly VAT (every 3 months)
    if (month % 3 === 0) {
      transactions.push({
        userId,
        externalId: `demo-vat-${month}`,
        source: 'demo',
        date: subDays(monthDate, 7),
        amount: 850000 + Math.floor(Math.random() * 150000), // £8,500 +/- £1,500
        type: 'expense',
        description: 'VAT Payment to HMRC',
        category: 'tax',
        contact: 'HMRC',
      })
    }

    // Random misc expenses
    const numMisc = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numMisc; i++) {
      transactions.push({
        userId,
        externalId: `demo-misc-${month}-${i}`,
        source: 'demo',
        date: subDays(monthDate, Math.floor(Math.random() * 28)),
        amount: 10000 + Math.floor(Math.random() * 40000), // £100 - £500
        type: 'expense',
        description: ['Office Supplies', 'Travel', 'Client Entertainment', 'Marketing', 'Training'][i % 5],
        category: 'other',
        contact: null,
      })
    }
  }

  // Insert all transactions
  await prisma.transaction.createMany({
    data: transactions,
  })

  // Mark user as having demo data
  await prisma.user.update({
    where: { id: userId },
    data: {
      xeroConnectedAt: new Date(), // Pretend Xero is connected
    },
  })

  // Generate forecast
  await generateForecast(userId)

  return { transactionCount: transactions.length }
}

export async function clearDemoData(userId: string) {
  await prisma.transaction.deleteMany({
    where: { userId, source: 'demo' },
  })

  await prisma.forecast.deleteMany({
    where: { userId },
  })

  await prisma.alert.deleteMany({
    where: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      xeroConnectedAt: null,
      xeroAccessToken: null,
      xeroRefreshToken: null,
      xeroTenantId: null,
    },
  })
}
