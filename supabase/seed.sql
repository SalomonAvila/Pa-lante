-- Datos de la cuenta semilla de prueba (ficticios; PRODUCT.md prohíbe usar
-- datos reales del equipo en demos).
--
-- Cuenta semilla del equipo: palante.platanus@gmail.com
--
--   1. Entra UNA vez a la app con ese correo (enlace mágico o Google, da
--      igual: el buzón se creó para la hackathon y no tiene correo real).
--   2. Aplica primero todas las migraciones y luego corre este archivo en el
--      SQL Editor de Supabase.
--
-- Es idempotente: borra las transacciones y deudas de esta cuenta antes de
-- insertar, así que se puede correr las veces que haga falta.
--
-- Historia: Daniela trabaja por cuenta propia y quiere demostrar capacidad
-- económica para un arriendo sin compartir extractos o compras personales.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'palante.platanus@gmail.com';

  if v_user_id is null then
    raise exception 'No existe el usuario semilla. Entra primero a la app con ese correo.';
  end if;

  delete from public.planes where user_id = v_user_id;
  delete from public.hallazgos_financieros where user_id = v_user_id;
  delete from public.deudas where user_id = v_user_id;
  delete from public.transacciones where user_id = v_user_id;

  insert into public.deudas (user_id, entidad, tipo, saldo, tasa_ea, cuota_mensual, fuente)
  values
    (v_user_id, 'Bancolombia', 'tarjeta', 8000000, 24.5, 650000, 'manual');

  -- Seis meses de ingresos variables observados en dos cuentas. La mediana
  -- mensual es $3.950.000 frente a $4.200.000 declarados (94,05% verificable).
  insert into public.transacciones
    (user_id, fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza)
  select v_user_id, fecha, monto, 'ingreso', raw, norm, categoria, cuenta, fuente::fuente_dato, confianza
  from (values
    (date '2026-03-05', 3600000::numeric, 'ABONOS CLIENTES MARZO', 'Ingresos actividad independiente', 'ingresos independientes', 'Nequi', 'gmail', 0.94::numeric),
    (date '2026-04-05', 3800000::numeric, 'ABONOS CLIENTES ABRIL', 'Ingresos actividad independiente', 'ingresos independientes', 'Bancolombia', 'pdf', 0.94::numeric),
    (date '2026-05-05', 3900000::numeric, 'ABONOS CLIENTES MAYO', 'Ingresos actividad independiente', 'ingresos independientes', 'Nequi', 'gmail', 0.94::numeric),
    (date '2026-06-05', 4000000::numeric, 'ABONOS CLIENTES JUNIO', 'Ingresos actividad independiente', 'ingresos independientes', 'Bancolombia', 'pdf', 0.94::numeric),
    (date '2026-07-05', 4150000::numeric, 'ABONOS CLIENTES JULIO', 'Ingresos actividad independiente', 'ingresos independientes', 'Nequi', 'gmail', 0.94::numeric),
    (date '2026-08-05', 4300000::numeric, 'ABONOS CLIENTES AGOSTO', 'Ingresos actividad independiente', 'ingresos independientes', 'Bancolombia', 'pdf', 0.94::numeric)
  ) as ingresos(fecha, monto, raw, norm, categoria, cuenta, fuente, confianza);

  -- Gastos por categoría; la cuota de la deuda aparece como transacción y no
  -- se vuelve a restar en el cálculo de flujo.
  insert into public.transacciones
    (user_id, fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza)
  select
    v_user_id,
    (date '2026-03-08' + (n || ' month')::interval)::date,
    c.monto, 'gasto', c.raw, c.norm, c.categoria, 'Bancolombia Ahorros', 'gmail', c.confianza
  from generate_series(0, 5) as n
  cross join (values
    (1100000, 'PAGO PSE ARRIENDO INMOB', 'Inmobiliaria', 'arriendo', 0.95),
    ( 480000, 'COMPRA MERCADO', 'Mercado del hogar', 'mercado', 0.93),
    ( 230000, 'TRANSPORTE DEL MES', 'Transporte', 'transporte', 0.90),
    ( 190000, 'SERVICIOS DEL HOGAR', 'Servicios', 'servicios', 0.94),
    ( 650000, 'PAGO CUOTA TARJETA', 'Bancolombia', 'cuotas de deuda', 0.97)
  ) as c(monto, raw, norm, categoria, confianza);

  insert into public.hallazgos_financieros
    (user_id, tipo, fuente, procedencia, periodo, datos, confianza)
  values
    (
      v_user_id, 'income', 'WhatsApp', 'declarado', '2026-08',
      '{"valor_mensual": 4200000, "concepto": "Ingreso independiente declarado"}'::jsonb,
      1.0
    ),
    (
      v_user_id, 'income', 'dian', 'observado', '2025',
      '{"valor_anual": 49200000, "concepto": "Ingreso fiscal anual"}'::jsonb,
      0.85
    ),
    (
      v_user_id, 'liability', 'datacredito', 'observado', '2026-08',
      '{"entidad": "Bancolombia", "tipo": "tarjeta", "saldo": 8000000, "tasa_ea": 24.5, "cuota_mensual": 650000}'::jsonb,
      0.95
    ),
    (
      v_user_id, 'credit_report', 'datacredito', 'observado', '2026-08',
      '{"obligaciones_activas": 1}'::jsonb,
      0.95
    );

  insert into public.planes
    (user_id, meta, aporte_mensual, pasos, supuestos, fecha_objetivo, activo, tipo_meta, datos_meta)
  values (
    v_user_id,
    'Demostrar capacidad económica para arrendar una vivienda sin compartir transacciones personales',
    0,
    '[]'::jsonb,
    '["Pa''lante demuestra contexto; la inmobiliaria conserva sus reglas de decisión"]'::jsonb,
    date '2026-09-15',
    true,
    'demostrar_capacidad_arriendo',
    '{"canon_mensual_objetivo": 1300000, "ingreso_mensual_declarado": 4200000, "proposito": "evaluar_capacidad_arriendo"}'::jsonb
  );
end $$;
