import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthToken, unauthorizedResponse, internalErrorResponse,
  safeJsonParse, getProxyHeaders, validateBody,
} from '@/lib/api/validation'
import { createBrandSchema } from '@/lib/api/schemas/brands'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://reparaelec_nginx/api'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    // Reenviar query params (category_id, etc.)
    const { searchParams } = request.nextUrl
    const qs = searchParams.toString()
    const url = qs ? `${BACKEND_URL}/brands?${qs}` : `${BACKEND_URL}/admin/brands`

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

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const validation = await validateBody(request, createBrandSchema)
    if (validation.error) return validation.error

    const response = await fetch(`${BACKEND_URL}/admin/brands`, {
      method: 'POST',
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
    return NextResponse.json(data, { status: 201 })
  } catch {
    return internalErrorResponse()
  }
}
