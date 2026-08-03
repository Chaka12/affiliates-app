import { db } from '@/lib/db'
import { hashPin, generateAgentId, DEFAULT_COMMISSION_RATE, DEFAULT_PRICE_PER_SUBJECT } from '@/lib/auth'

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Sesotho',
  'Social Studies',
  'Agriculture',
  'Home Economics',
  'Business Studies',
  'Computer Studies',
  'Religious Education',
  'Life Skills',
  'Creative Arts',
]

/**
 * Seed the database with:
 *  - default admin_settings
 *  - default subjects (with default price)
 *  - a default admin agent
 *  - a demo agent
 *
 * Safe to run multiple times — skips seeding if records already exist.
 */
export async function seedDatabase() {
  try {
    // 1. Ensure default settings exist
    const priceSetting = await db.adminSetting.findUnique({
      where: { settingKey: 'price_per_subject' },
    })
    if (!priceSetting) {
      await db.adminSetting.create({
        data: {
          settingKey: 'price_per_subject',
          settingValue: String(process.env.PRICE_PER_SUBJECT || DEFAULT_PRICE_PER_SUBJECT),
        },
      })
    }

    const schoolNameSetting = await db.adminSetting.findUnique({
      where: { settingKey: 'school_name' },
    })
    if (!schoolNameSetting) {
      await db.adminSetting.create({
        data: {
          settingKey: 'school_name',
          settingValue: 'Remedial School Affiliate Program',
        },
      })
    }

    // 2. Ensure default subjects exist (idempotent by name)
    for (let i = 0; i < DEFAULT_SUBJECTS.length; i++) {
      const name = DEFAULT_SUBJECTS[i]
      const existing = await db.subject.findUnique({ where: { name } })
      if (!existing) {
        await db.subject.create({
          data: {
            name,
            price: DEFAULT_PRICE_PER_SUBJECT,
            isActive: true,
            sortOrder: i,
          },
        })
      }
    }

    // 3. Ensure default admin account exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@remedialschool.com'
    const adminPin = process.env.ADMIN_PIN || '1234'

    const existingAdmin = await db.agent.findUnique({
      where: { email: adminEmail },
    })
    if (!existingAdmin) {
      const agentId = await generateAgentId()
      const pinHash = await hashPin(adminPin)
      await db.agent.create({
        data: {
          agentId,
          fullName: 'System Administrator',
          email: adminEmail,
          pinHash,
          phone: '',
          commissionRate: DEFAULT_COMMISSION_RATE,
          status: 'Active',
          role: 'admin',
        },
      })
      console.log(`[seed] Created admin account: ${adminEmail} (agent_id: ${agentId})`)
    }

    // 4. Ensure demo agent exists
    const demoEmail = 'agent@demo.com'
    const existingDemo = await db.agent.findUnique({
      where: { email: demoEmail },
    })
    if (!existingDemo) {
      const agentId = await generateAgentId()
      const pinHash = await hashPin('1234')
      await db.agent.create({
        data: {
          agentId,
          fullName: 'Demo Agent',
          email: demoEmail,
          pinHash,
          phone: '+26658001234',
          commissionRate: 15.0,
          status: 'Active',
          role: 'agent',
        },
      })
      console.log(`[seed] Created demo agent: ${demoEmail} / pin 1234 (agent_id: ${agentId})`)
    }

    return true
  } catch (err) {
    console.error('[seed] Failed to seed database:', err)
    return false
  }
}
