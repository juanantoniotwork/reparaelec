import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthToken, unauthorizedResponse, internalErrorResponse,
  safeJsonParse, getProxyHeaders,
} from '@/lib/api/validation'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://reparaelec_nginx/api'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    // Reenviar query params (feedback, user_id, date_from, date_to)
    const { searchParams } = request.nextUrl
    const qs = searchParams.toString()
    const url = qs
      ? `${BACKEND_URL}/admin/interactions?${qs}`
      : `${BACKEND_URL}/admin/interactions`

    const response = await fetch(url, {
      method: 'GET',
      headers: getProxyHeaders(request, token, false),
    })
    const data = await safeJsonParse(response)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'Error' },
        { status: response.status },
      )
    }
    return NextResponse.json(data)
  } catch {
    return internalErrorResponse()
  }
}
