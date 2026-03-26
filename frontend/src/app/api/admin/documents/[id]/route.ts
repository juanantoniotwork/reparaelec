import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthToken, isValidId, invalidIdResponse, unauthorizedResponse,
  internalErrorResponse, safeJsonParse, getProxyHeaders,
} from '@/lib/api/validation'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://reparaelec_nginx/api'

type RouteParams = { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    if (!isValidId(id)) return invalidIdResponse()

    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const response = await fetch(`${BACKEND_URL}/admin/documents/${id}`, {
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

// PUT usa multipart/form-data (el fichero es opcional en update).
// Se reenvía el FormData directamente al backend.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    if (!isValidId(id)) return invalidIdResponse()

    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const formData = await request.formData()

    // Laravel no acepta PUT con multipart directamente en algunos setups;
    // se añade _method=PUT para que lo trate como PUT (Laravel method spoofing).
    formData.append('_method', 'PUT')

    const response = await fetch(`${BACKEND_URL}/admin/documents/${id}`, {
      method: 'POST',  // POST + _method=PUT (method spoofing)
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
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

    const response = await fetch(`${BACKEND_URL}/admin/documents/${id}`, {
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
