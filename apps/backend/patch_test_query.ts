const data1 = new Date("2026-05-14T00:00:00.000Z");
const inicio = new Date("2026-05-10T00:00:00.000Z");
const fim = new Date("2026-05-16T23:59:59.999Z");

console.log("Is between?", data1 >= inicio && data1 <= fim);
