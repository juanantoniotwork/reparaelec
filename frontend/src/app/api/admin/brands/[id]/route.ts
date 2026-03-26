import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthToken, isValidId, invalidIdResponse, unauthorizedResponse,
  internalErrorResponse, safeJsonParse, getProxyHeaders, validateBody,
} from '@/lib/api/validation'
import { updateBrandSchema } from '@/lib/api/schemas/brands'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://reparaelec_nginx/api'

type RouteParams = { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    if (!isValidId(id)) return invalidIdResponse()

    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const response = await fetch(`${BACKEND_URL}/brands/${id}`, {
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    if (!isValidId(id)) return invalidIdResponse()

    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const validation = await validateBody(request, updateBrandSchema)
    if (validation.error) return validation.error

    const response = await fetch(`${BACKEND_URL}/brands/${id}`, {
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    if (!isValidId(id)) return invalidIdResponse()

    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const response = await fetch(`${BACKEND_URL}/brands/${id}`, {
      method: 'DELETE',
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
