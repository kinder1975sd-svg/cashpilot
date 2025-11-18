import { getXeroClient } from './xero'
import { prisma } from './db'

export async function syncXeroTransactions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.xeroAccessToken || !user.xeroRefreshToken) {
    throw new Error('Xero not connected')
  }

  let xeroClient = await getXeroClient(user.xeroAccessToken, user.xeroRefreshToken)

  // Check if token expired and refresh if needed
  if (user.xeroTokenExpiry && new Date() > user.xeroTokenExpiry) {
    const newTokenSet = await xeroClient.refreshToken()

    await prisma.user.update({
      where: { id: userId },
      data: {
        xeroAccessToken: newTokenSet.access_token,
        xeroRefreshToken: newTokenSet.refresh_token,
        xeroTokenExpiry: newTokenSet.expires_at
          ? new Date(newTokenSet.expires_at * 1000)
          : new Date(Date.now() + (newTokenSet.expires_in || 1800) * 1000),
      },
    })

    // Get client with new tokens
    xeroClient = await getXeroClient(
      newTokenSet.access_token!,
      newTokenSet.refresh_token!
    )
  }

  // Fetch bank transactions from last 12 months
  const since = new Date()
  since.setMonth(since.getMonth() - 12)

  const response = await xeroClient.accountingApi.getBankTransactions(
    user.xeroTenantId!,
    undefined, // If-Modified-Since
    `Date >= DateTime(${since.getFullYear()}, ${since.getMonth() + 1}, ${since.getDate()})`,
    undefined, // order
    undefined, // page
    100 // pageSize
  )

  const transactions = response.body.bankTransactions || []

  // Store in database
  for (const txn of transactions) {
    const lineItems = txn.lineItems || []
    const amount = lineItems.reduce((sum, item) => sum + (item.lineAmount || 0), 0)

    await prisma.transaction.upsert({
      where: {
        userId_externalId_source: {
          userId: user.id,
          externalId: txn.bankTransactionID!,
          source: 'xero',
        },
      },
      create: {
        userId: user.id,
        externalId: txn.bankTransactionID!,
        source: 'xero',
        date: new Date(txn.date!),
        amount: Math.round(amount * 100), // Convert to pence
        type: txn.type === 'SPEND' ? 'expense' : 'income',
        description: txn.reference || 'Unknown',
        contact: txn.contact?.name,
        category: categorizeTransaction(txn.reference || ''),
      },
      update: {
        date: new Date(txn.date!),
        amount: Math.round(amount * 100),
        type: txn.type === 'SPEND' ? 'expense' : 'income',
        description: txn.reference || 'Unknown',
        contact: txn.contact?.name,
        category: categorizeTransaction(txn.reference || ''),
      },
    })
  }

  return { synced: transactions.length }
}

// Basic categorization (can be improved with AI later)
function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase()

  if (desc.includes('payroll') || desc.includes('salary') || desc.includes('paye') || desc.includes('wages')) {
    return 'payroll'
  }
  if (desc.includes('rent') || desc.includes('lease') || desc.includes('property')) {
    return 'rent'
  }
  if (desc.includes('vat') || desc.includes('tax') || desc.includes('hmrc') || desc.includes('corporation')) {
    return 'tax'
  }
  if (desc.includes('insurance')) {
    return 'insurance'
  }
  if (desc.includes('utility') || desc.includes('electric') || desc.includes('gas') || desc.includes('water')) {
    return 'utilities'
  }
  if (desc.includes('software') || desc.includes('subscription') || desc.includes('saas')) {
    return 'software'
  }

  return 'other'
}
