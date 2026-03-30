import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthToken, unauthorizedResponse, internalErrorResponse,
  safeJsonParse, getProxyHeaders, validateBody,
} from '@/lib/api/validation'
import { createUserSchema } from '@/lib/api/schemas/users'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://reparaelec_nginx/api'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const qs = request.nextUrl.searchParams.toString()
    const url = qs ? `${BACKEND_URL}/users?${qs}` : `${BACKEND_URL}/users`
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

    const validation = await validateBody(request, createUserSchema)
    if (validation.error) return validation.error

    const response = await fetch(`${BACKEND_URL}/users`, {
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
