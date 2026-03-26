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

    // Reenviar query params (category_id, brand_id)
    const { searchParams } = request.nextUrl
    const qs = searchParams.toString()
    const url = qs ? `${BACKEND_URL}/documents?${qs}` : `${BACKEND_URL}/documents`

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

// POST usa multipart/form-data (subida de fichero PDF/DOC).
// Se reenvía el FormData directamente al backend — Laravel valida title y file.
export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return unauthorizedResponse()

    const formData = await request.formData()

    const response = await fetch(`${BACKEND_URL}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        // Content-Type NO se fija manualmente: fetch lo genera con el boundary correcto
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
    return NextResponse.json(data, { status: 201 })
  } catch {
    return internalErrorResponse()
  }
}
