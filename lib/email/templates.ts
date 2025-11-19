export function lowCashAlertTemplate({
  userName,
  weekLabel,
  projectedCash,
  safetyBuffer,
  dashboardUrl,
}: {
  userName: string
  weekLabel: string
  projectedCash: number
  safetyBuffer: number
  dashboardUrl: string
}) {
  const projectedFormatted = (projectedCash / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
  })
  const bufferFormatted = (safetyBuffer / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
  })

  const isCritical = projectedCash < 0

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">CashPilot</h1>
  </div>

  <div style="background: ${isCritical ? '#fef2f2' : '#fffbeb'}; border-left: 4px solid ${isCritical ? '#ef4444' : '#f59e0b'}; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 10px 0; color: ${isCritical ? '#dc2626' : '#d97706'};">
      ${isCritical ? 'Critical: Cash Flow Alert' : 'Warning: Low Cash Forecast'}
    </h2>
    <p style="margin: 0;">
      Hi ${userName},<br><br>
      Your cash flow forecast shows a potential issue in <strong>${weekLabel}</strong>.
    </p>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Projected Cash</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${projectedCash < 0 ? '#dc2626' : '#333'};">
          £${projectedFormatted}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">Your Safety Buffer</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold;">
          £${bufferFormatted}
        </td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 20px;">
    <h3 style="margin: 0 0 10px 0;">Recommended Actions:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${isCritical ? `
        <li>Review and prioritize upcoming payments</li>
        <li>Follow up on outstanding invoices immediately</li>
        <li>Consider delaying non-essential expenses</li>
        <li>Contact your bank about overdraft facilities</li>
      ` : `
        <li>Review upcoming payment schedules</li>
        <li>Follow up on outstanding invoices</li>
        <li>Consider adjusting payment timing</li>
      `}
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      View Dashboard
    </a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
    <p>
      You're receiving this because you have cash flow alerts enabled.<br>
      <a href="${dashboardUrl}/settings" style="color: #6b7280;">Manage notification settings</a>
    </p>
    <p>© ${new Date().getFullYear()} CashPilot. Built for UK SMEs.</p>
  </div>
</body>
</html>
  `
}

export function weeklyDigestTemplate({
  userName,
  currentCash,
  lowestPoint,
  lowestPointWeek,
  totalIncome,
  totalExpenses,
  alertCount,
  dashboardUrl,
}: {
  userName: string
  currentCash: number
  lowestPoint: number
  lowestPointWeek: string
  totalIncome: number
  totalExpenses: number
  alertCount: number
  dashboardUrl: string
}) {
  const formatCurrency = (amount: number) =>
    (amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">CashPilot</h1>
  </div>

  <h2 style="margin: 0 0 20px 0;">Weekly Cash Flow Summary</h2>

  <p>Hi ${userName},</p>
  <p>Here's your weekly cash flow overview for the next 13 weeks.</p>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #166534;">Current Cash</p>
      <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #166534;">
        £${formatCurrency(currentCash)}
      </p>
    </div>
    <div style="background: ${lowestPoint < 0 ? '#fef2f2' : '#fffbeb'}; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: ${lowestPoint < 0 ? '#dc2626' : '#d97706'};">Lowest Point</p>
      <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: ${lowestPoint < 0 ? '#dc2626' : '#d97706'};">
        £${formatCurrency(lowestPoint)}
      </p>
      <p style="margin: 5px 0 0 0; font-size: 10px; color: #6b7280;">${lowestPointWeek}</p>
    </div>
  </div>

  <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;">13-Week Projected Income</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a;">
          +£${formatCurrency(totalIncome)}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">13-Week Projected Expenses</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #dc2626;">
          -£${formatCurrency(totalExpenses)}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">Active Alerts</td>
        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
          ${alertCount}
        </td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      View Full Forecast
    </a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
    <p>
      You're receiving this weekly digest because you have email notifications enabled.<br>
      <a href="${dashboardUrl}/settings" style="color: #6b7280;">Manage notification settings</a>
    </p>
    <p>© ${new Date().getFullYear()} CashPilot. Built for UK SMEs.</p>
  </div>
</body>
</html>
  `
}

export function connectionSuccessTemplate({
  userName,
  provider,
  transactionCount,
  dashboardUrl,
}: {
  userName: string
  provider: 'Xero' | 'QuickBooks'
  transactionCount: number
  dashboardUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">CashPilot</h1>
  </div>

  <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 10px 0; color: #166534;">
      ${provider} Connected Successfully!
    </h2>
  </div>

  <p>Hi ${userName},</p>

  <p>
    Great news! Your ${provider} account is now connected to CashPilot.
    We've synced <strong>${transactionCount.toLocaleString()} transactions</strong>
    from the last 12 months and generated your first 13-week cash flow forecast.
  </p>

  <h3>What happens next?</h3>
  <ul>
    <li>We'll automatically sync new transactions daily</li>
    <li>Your forecast will update each time new data arrives</li>
    <li>You'll receive alerts when cash is projected to run low</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      View Your Forecast
    </a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
    <p>© ${new Date().getFullYear()} CashPilot. Built for UK SMEs.</p>
  </div>
</body>
</html>
  `
}
