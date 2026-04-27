import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ── Usuário admin ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('minhasenha123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 're.pcarvalho@gmail.com' },
    update: {},
    create: {
      email: 're.pcarvalho@gmail.com',
      passwordHash,
      role: 'admin',
    },
  })

  console.log(`✅ Usuário criado: ${admin.email} (${admin.role})`)

  // ── Configurações default ──────────────────────────────────
  await prisma.configuration.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      metaIdealPct: 0.02,
      metaMaximaPct: 0.03,
      stopDiarioPct: 0.06,
      riscoMaxCicloPct: 0.06,
      pctSugeridaEntrada: 0.02,
      fatorMG1: 2,
      fatorMG2: 2,
      mg2Habilitado: false,
      maxEntradasPorCiclo: 3,
      maxCiclosPorDia: 3,
      cambioCompra: 5.2,
      cambioVenda: 4.8,
      retornoConservador: 0.2,
      retornoRealista: 0.4,
      retornoAgressivo: 0.6,
    },
  })

  console.log('✅ Configurações default criadas')

  // ── Motivos de entrada iniciais ────────────────────────────
  const motivos = ['Live', 'IA', 'Setup próprio', 'Outro']

  for (const nome of motivos) {
    await prisma.motivoEntrada.upsert({
      where: {
        // usa findFirst para evitar erro de unique - seed idempotente
        id: (
          await prisma.motivoEntrada.findFirst({
            where: { userId: admin.id, nome },
          })
        )?.id ?? 'noop',
      },
      update: {},
      create: {
        userId: admin.id,
        nome,
        ativo: true,
      },
    })
  }

  console.log(`✅ Motivos de entrada criados: ${motivos.join(', ')}`)
  console.log('\n🚀 Seed concluído com sucesso!')
  console.log(`\n📧 Login: re.pcarvalho@gmail.com`)
  console.log(`🔑 Senha: minhasenha123`)
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
