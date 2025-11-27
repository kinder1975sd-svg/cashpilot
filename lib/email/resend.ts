import { Resend } from 'resend'

// Lazy initialize to avoid build-time errors when env vars aren't set
let resendInstance: Resend | null = null

function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: 'CashPilot <alerts@cashpilot.app>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}
