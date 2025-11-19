import { prisma } from './db'
import { makeQuickBooksRequest, refreshQuickBooksToken } from './quickbooks'

export async function syncQuickBooksTransactions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.qbAccessToken || !user.qbRefreshToken || !user.qbRealmId) {
    throw new Error('QuickBooks not connected')
  }

  let accessToken = user.qbAccessToken

  // Check if token expired and refresh if needed
  if (user.qbTokenExpiry && new Date() > user.qbTokenExpiry) {
    const newTokens = await refreshQuickBooksToken(user.qbRefreshToken)

    await prisma.user.update({
      where: { id: userId },
      data: {
        qbAccessToken: newTokens.access_token,
        qbRefreshToken: newTokens.refresh_token,
        qbTokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000),
      },
    })

    accessToken = newTokens.access_token
  }

  // Fetch transactions from last 12 months
  const since = new Date()
  since.setMonth(since.getMonth() - 12)
  const sinceStr = since.toISOString().split('T')[0]

  // Query purchases (expenses)
  const purchasesQuery = encodeURIComponent(
    `SELECT * FROM Purchase WHERE TxnDate >= '${sinceStr}'`
  )
  const purchasesData = await makeQuickBooksRequest(
    accessToken,
    user.qbRealmId,
    `query?query=${purchasesQuery}`
  )

  // Query invoices (income)
  const invoicesQuery = encodeURIComponent(
    `SELECT * FROM Invoice WHERE TxnDate >= '${sinceStr}'`
  )
  const invoicesData = await makeQuickBooksRequest(
    accessToken,
    user.qbRealmId,
    `query?query=${invoicesQuery}`
  )

  let syncedCount = 0

  // Process purchases (expenses)
  const purchases = purchasesData.QueryResponse?.Purchase || []
  for (const purchase of purchases) {
    await prisma.transaction.upsert({
      where: {
        userId_externalId_source: {
          userId: user.id,
          externalId: purchase.Id,
          source: 'quickbooks',
        },
      },
      create: {
        userId: user.id,
        externalId: purchase.Id,
        source: 'quickbooks',
        date: new Date(purchase.TxnDate),
        amount: Math.round(purchase.TotalAmt * 100),
        type: 'expense',
        description: purchase.PrivateNote || 'Purchase',
        contact: purchase.EntityRef?.name,
        category: categorizeQBTransaction(purchase),
      },
      update: {
        date: new Date(purchase.TxnDate),
        amount: Math.round(purchase.TotalAmt * 100),
        description: purchase.PrivateNote || 'Purchase',
        contact: purchase.EntityRef?.name,
        category: categorizeQBTransaction(purchase),
      },
    })
    syncedCount++
  }

  // Process invoices (income)
  const invoices = invoicesData.QueryResponse?.Invoice || []
  for (const invoice of invoices) {
    await prisma.transaction.upsert({
      where: {
        userId_externalId_source: {
          userId: user.id,
          externalId: invoice.Id,
          source: 'quickbooks',
        },
      },
      create: {
        userId: user.id,
        externalId: invoice.Id,
        source: 'quickbooks',
        date: new Date(invoice.TxnDate),
        amount: Math.round(invoice.TotalAmt * 100),
        type: 'income',
        description: `Invoice ${invoice.DocNumber || ''}`.trim(),
        contact: invoice.CustomerRef?.name,
        category: 'sales',
      },
      update: {
        date: new Date(invoice.TxnDate),
        amount: Math.round(invoice.TotalAmt * 100),
        description: `Invoice ${invoice.DocNumber || ''}`.trim(),
        contact: invoice.CustomerRef?.name,
        category: 'sales',
      },
    })
    syncedCount++
  }

  return { synced: syncedCount }
}

function categorizeQBTransaction(purchase: { AccountRef?: { name?: string }; PrivateNote?: string }): string {
  const accountName = purchase.AccountRef?.name?.toLowerCase() || ''
  const note = purchase.PrivateNote?.toLowerCase() || ''

  if (accountName.includes('payroll') || note.includes('payroll') || note.includes('salary')) {
    return 'payroll'
  }
  if (accountName.includes('rent') || note.includes('rent')) {
    return 'rent'
  }
  if (accountName.includes('tax') || note.includes('vat') || note.includes('hmrc')) {
    return 'tax'
  }
  if (accountName.includes('insurance') || note.includes('insurance')) {
    return 'insurance'
  }
  if (accountName.includes('utilities') || note.includes('electric') || note.includes('gas')) {
    return 'utilities'
  }

  return 'other'
}
