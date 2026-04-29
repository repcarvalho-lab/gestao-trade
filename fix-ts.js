const fs = require('fs')
const files = [
  'apps/frontend/src/pages/Relatorios/components/AbaAtivos.tsx',
  'apps/frontend/src/pages/Relatorios/components/AbaDiaSemana.tsx',
  'apps/frontend/src/pages/Relatorios/components/AbaDisciplina.tsx',
  'apps/frontend/src/pages/Relatorios/components/AbaEficienciaMeta.tsx',
  'apps/frontend/src/pages/Relatorios/components/AbaErros.tsx',
  'apps/frontend/src/pages/Relatorios/components/AbaEstrategias.tsx',
  'apps/frontend/src/pages/Relatorios/components/AbaPerformance.tsx',
  'apps/frontend/src/pages/Relatorios/components/RelatoriosShared.tsx',
  'apps/frontend/src/pages/Relatorios/components/ScoreCard.tsx',
  'apps/frontend/src/pages/Relatorios/Relatorios.tsx'
]

files.forEach(f => {
  if (!fs.existsSync(f)) return
  let content = fs.readFileSync(f, 'utf8')
  content = content.replace(/import React, \{/g, 'import {')
  content = content.replace(/import React from 'react'\n/g, '')
  content = content.replace(/const resultColor = \(v: number\) => v > 0 \? 'var\(--accent-win\)' : v < 0 \? 'var\(--accent-loss\)' : 'var\(--text-muted\)'\n/g, '')
  fs.writeFileSync(f, content)
})
