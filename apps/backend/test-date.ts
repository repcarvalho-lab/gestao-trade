const data = new Date("2026-05-12T12:00:00Z");
const inicioSemana = new Date(data)
const diaSemana = data.getUTCDay() // dom=0
inicioSemana.setUTCDate(data.getUTCDate() - diaSemana)
inicioSemana.setUTCHours(0, 0, 0, 0)

const fimSemana = new Date(inicioSemana)
fimSemana.setUTCDate(inicioSemana.getUTCDate() + 6)
fimSemana.setUTCHours(23, 59, 59, 999)

console.log({ 
  inicioSemana: inicioSemana.toISOString(), 
  fimSemana: fimSemana.toISOString() 
})
