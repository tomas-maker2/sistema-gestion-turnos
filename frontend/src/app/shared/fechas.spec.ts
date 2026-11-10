import {
  aEntradaLocal, aFecha, aTextoLocal, desdeEntradaLocal, desdeFecha, esMismoDia, formatoDia, formatoDiaCorto,
  formatoSemana, hora, lunesDeLaSemana, sumarDias,
} from './fechas';

describe('fechas', () => {
  const martes = new Date(2026, 10, 10, 9, 5, 7); // martes 10/11/2026 09:05:07

  describe('formatos de salida (sin zona horaria, como los usa la API)', () => {
    it('aFecha_da_AAAA_MM_DD', () => expect(aFecha(martes)).toBe('2026-11-10'));
    it('aEntradaLocal_da_el_formato_de_datetime_local', () => expect(aEntradaLocal(martes)).toBe('2026-11-10T09:05'));
    it('aTextoLocal_agrega_los_segundos', () => expect(aTextoLocal(martes)).toBe('2026-11-10T09:05:07'));

    it('completa_con_ceros_los_numeros_de_un_digito', () => {
      expect(aTextoLocal(new Date(2026, 0, 3, 1, 2, 3))).toBe('2026-01-03T01:02:03');
    });
  });

  describe('lectura de textos', () => {
    it('desdeFecha_lee_el_dia_en_hora_local_sin_correrse_por_la_zona_horaria', () => {
      const d = desdeFecha('2026-11-10');
      expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 10, 0]);
    });

    it.each(['2026-11-10T09:05', '2026-11-10T09:05:00'])('desdeEntradaLocal_lee_%s', (texto) => {
      const d = desdeEntradaLocal(texto);
      expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 10, 9, 5]);
    });

    it('hora_extrae_HH_mm_de_un_texto_de_la_API', () => {
      expect(hora('2026-11-10T09:05:00')).toBe('09:05');
      expect(hora('2026-11-10T18:30:00')).toBe('18:30');
    });
  });

  describe('aritmética de días', () => {
    it('sumarDias_cruza_el_fin_de_mes_y_deja_la_hora_en_cero', () => {
      const d = sumarDias(new Date(2026, 10, 29, 15, 30), 3); // 29/11 + 3 días
      expect(aTextoLocal(d)).toBe('2026-12-02T00:00:00');
    });

    it('sumarDias_acepta_negativos', () => {
      expect(aFecha(sumarDias(new Date(2026, 0, 2), -5))).toBe('2025-12-28');
    });

    it.each([
      ['martes', new Date(2026, 10, 10), '2026-11-09'],
      ['lunes', new Date(2026, 10, 9), '2026-11-09'],
      ['domingo', new Date(2026, 10, 15), '2026-11-09'],
      ['lunes_siguiente', new Date(2026, 10, 16), '2026-11-16'],
    ])('lunesDeLaSemana_de_un_%s', (_nombre, fecha, esperado) => {
      expect(aFecha(lunesDeLaSemana(fecha))).toBe(esperado);
    });

    it('esMismoDia_ignora_la_hora', () => {
      expect(esMismoDia(new Date(2026, 10, 10, 1), new Date(2026, 10, 10, 23))).toBe(true);
      expect(esMismoDia(new Date(2026, 10, 10), new Date(2026, 10, 11))).toBe(false);
    });
  });

  describe('textos para mostrar', () => {
    it('formatoDia_arranca_con_mayuscula', () => expect(formatoDia(martes)).toBe('Martes, 10 de noviembre de 2026'));
    it('formatoDiaCorto_no_lleva_el_anio', () => expect(formatoDiaCorto(martes)).toBe('Martes, 10 de noviembre'));

    it('formatoSemana_va_del_lunes_al_domingo', () => {
      expect(formatoSemana(new Date(2026, 10, 9))).toBe('9 de noviembre al 15 de noviembre de 2026');
    });

    it('formatoSemana_cruza_de_mes', () => {
      expect(formatoSemana(new Date(2026, 10, 30))).toBe('30 de noviembre al 6 de diciembre de 2026');
    });
  });
});
