import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthToken, unauthorizedResponse, internalErrorResponse,
  safeJsonParse, getProxyHeaders, validateBody,
} from '@/lib/api/validation'
import { updateSettingsSchema } from '@/lib/api/schemas/settings'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://reparaelec_nginx/api'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const response = await fetch(`${BACKEND_URL}/admin/settings`, {
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

export async function PUT(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const validation = await validateBody(request, updateSettingsSchema)
    if (validation.error) return validation.error

    const response = await fetch(`${BACKEND_URL}/admin/settings`, {
      method: 'PUT',
      headers: getProxyHeaders(request, token),
      body: JSON.stringify(validation.data),
    })
    const data = await safeJsonParse(response)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'Error', errors: data.errors },
        { status: response.status },
      )
    }
    return NextResponse.json(data)
  } catch {
    return internalErrorResponse()
  }
}
