import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { sanitizeText } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/subjects/:id
 * Body: { name?, price?, isActive?, sortOrder? }
 * Updates a subject's properties.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return fail('Invalid subject id', 400)

  const existing = await db.subject.findUnique({ where: { id: numericId } })
  if (!existing) return fail('Subject not found', 404)

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = sanitizeText(body.name)
    if (!name) return fail('Name is required', 400)
    if (name.length > 100) return fail('Name is too long', 400)
    // Check uniqueness if name is changing
    if (name !== existing.name) {
      const dup = await db.subject.findUnique({ where: { name } })
      if (dup) return fail(`Subject "${name}" already exists`, 409)
    }
    data.name = name
  }

  if (body.price !== undefined) {
    const price = Number(body.price)
    if (isNaN(price) || price < 0) return fail('Invalid price', 400)
    data.price = Math.round(price * 100) / 100
  }

  if (body.isActive !== undefined) {
    data.isActive = !!body.isActive
  }

  if (body.sortOrder !== undefined) {
    data.sortOrder = parseInt(String(body.sortOrder), 10) || 0
  }

  const updated = await db.subject.update({
    where: { id: numericId },
    data,
  })

  return ok({ subject: updated, message: 'Subject updated' })
}

/**
 * DELETE /api/admin/subjects/:id
 * Soft-deletes a subject by setting isActive = false.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return fail('Invalid subject id', 400)

  const existing = await db.subject.findUnique({ where: { id: numericId } })
  if (!existing) return fail('Subject not found', 404)

  const updated = await db.subject.update({
    where: { id: numericId },
    data: { isActive: false },
  })

  return ok({ subject: updated, message: `Subject "${existing.name}" deactivated` })
}
