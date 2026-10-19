// Pruebas de la lógica de agenda (RN-02, RF-CIT-03) y de los datos mock de citas (fase A3).
// Ejecutar desde la raíz del proyecto: node tests/agenda.test.mjs
const FE = new URL('../frontend/js', import.meta.url).href;
const { CITAS } = await import(FE + '/data/mock/citas.js');
const { HORARIOS, ESPECIALISTAS } = await import(FE + '/data/mock/especialistas.js');
const { getDaySlots, horariosDelDia, toMinutes, timeOf, suggestAlternatives, isSlotAvailable, describeSchedule } = await import(FE + '/core/agenda.js');
const { startOfWeek, addMonths, toISODate } = await import(FE + '/core/dates.js');
const { getToothName } = { getToothName: null };
let fails = 0; const check = (n, c, x='') => { console.log((c?'PASS ':'FAIL ') + n + (x?'  · '+x:'')); if(!c) fails++; };

const gen = CITAS.filter(c => c.id_cita > 40);
check('citas generadas', gen.length > 500, String(gen.length) + ' generadas, ' + CITAS.length + ' total');
const outside = gen.filter(c => { const m = toMinutes(timeOf(c.fecha_hora)); return !horariosDelDia(HORARIOS, c.id_especialista, c.fecha_hora.slice(0,10)).some(h => m >= toMinutes(h.hora_inicio) && m + 30 <= toMinutes(h.hora_fin)); });
check('RN-02: todas las generadas dentro del horario', outside.length === 0, outside.length + ' fuera');
const keys = CITAS.map(c => c.id_especialista + '|' + c.fecha_hora);
check('sin choques (mismo odontólogo y hora)', new Set(keys).size === keys.length);
check('ids únicos', new Set(CITAS.map(c => c.id_cita)).size === CITAS.length);
const today = toISODate();
check('pasadas no quedan PROGRAMADA (generadas)', !gen.some(c => c.fecha_hora.slice(0,10) < today && c.estado_cita === 'PROGRAMADA'));
check('futuras no quedan COMPLETADA', !gen.some(c => c.fecha_hora.slice(0,10) > today && c.estado_cita === 'COMPLETADA'));

// Agenda
const nextMonday = (() => { const d = startOfWeek(new Date()); d.setDate(d.getDate() + 7); return d; })();
const slotsMon = getDaySlots({ especialistaId: 1, date: nextMonday, horarios: HORARIOS, citas: [] });
check('lunes Dr. Roberto: 08:00–18:00 = 20 franjas, 4 bloqueadas (almuerzo)', slotsMon.length === 20 && slotsMon.filter(s => s.status === 'blocked').length === 4, slotsMon.map(s=>s.start+':'+s.status[0]).join(' '));
const sunday = new Date(nextMonday); sunday.setDate(sunday.getDate() - 1);
check('domingo: nadie atiende', ESPECIALISTAS.every(e => getDaySlots({ especialistaId: e.id_especialista, date: sunday, horarios: HORARIOS, citas: [] }).length === 0));
const alt = suggestAlternatives({ especialistaId: 2, date: sunday, horarios: HORARIOS, citas: [], especialistas: ESPECIALISTAS });
check('alternativas Dra. Sofía (domingo): 3 fechas Mar/Jue/Sáb', alt.sameDoctor.length === 3 && alt.sameDoctor.every(a => [2,4,6].includes(new Date(a.date + 'T12:00').getDay())), JSON.stringify(alt.sameDoctor.map(a => a.date + ' ' + a.start)));
check('alternativas: otros odontólogos el domingo = ninguno', alt.otherDoctors.length === 0);
const altTue = suggestAlternatives({ especialistaId: 3, date: new Date(nextMonday.getTime() + 86400000), horarios: HORARIOS, citas: [], especialistas: ESPECIALISTAS });
check('martes Dr. Andrés no atiende → sugiere Dr. Roberto y Dra. Sofía', altTue.otherDoctors.map(a=>a.especialistaId).join(',') === '1,2');
const busy = [{ id_especialista: 1, fecha_hora: toISODate(nextMonday) + ' 09:00:00', estado_cita: 'PROGRAMADA' }];
check('isSlotAvailable: ocupada → false', !isSlotAvailable({ especialistaId: 1, date: nextMonday, start: '09:00', horarios: HORARIOS, citas: busy }));
check('isSlotAvailable: almuerzo → false (RN-02)', !isSlotAvailable({ especialistaId: 1, date: nextMonday, start: '12:30', horarios: HORARIOS, citas: [] }));
check('isSlotAvailable: cancelada libera → true', isSlotAvailable({ especialistaId: 1, date: nextMonday, start: '09:00', horarios: HORARIOS, citas: [{ ...busy[0], estado_cita: 'CANCELADA' }] }));
check('pasado → no disponible', !isSlotAvailable({ especialistaId: 1, date: '2026-01-05', start: '09:00', horarios: HORARIOS, citas: [] }));
check('describeSchedule ordenado', describeSchedule(HORARIOS, 2) === 'Martes 08:00–14:00 · Jueves 08:00–14:00 · Sábado 08:00–12:00', describeSchedule(HORARIOS, 2));
check('dia_semana con tilde (Miércoles) reconocido', horariosDelDia(HORARIOS, 3, new Date(nextMonday.getTime() + 2*86400000)).length === 1);
check('addMonths fin de mes (31 ene + 1 = feb)', toISODate(addMonths('2026-01-31', 1)).startsWith('2026-02'));
console.log('FAILS', fails);
process.exitCode = fails ? 1 : 0;
