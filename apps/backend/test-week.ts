const date = new Date("2026-05-14T00:00:00.000Z");
const jan1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
const daysOffset = jan1.getUTCDay();
const days = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
const semana = Math.floor((days + daysOffset) / 7) + 1;
console.log({ daysOffset, days, semana });
