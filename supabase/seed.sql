-- Datos de la cuenta semilla de prueba (ficticios; PRODUCT.md prohíbe usar
-- datos reales del equipo en demos).
--
-- Cuenta semilla del equipo: palante.platanus@gmail.com
--
--   1. Entra UNA vez a la app con ese correo (enlace mágico o Google, da
--      igual: el buzón se creó para la hackathon y no tiene correo real).
--   2. Corre este archivo en el SQL Editor de Supabase.
--
-- Es idempotente: borra las transacciones y deudas de esta cuenta antes de
-- insertar, así que se puede correr las veces que haga falta.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'palante.platanus@gmail.com';

  if v_user_id is null then
    raise exception 'No existe el usuario semilla. Entra primero a la app con ese correo.';
  end if;

  delete from public.deudas where user_id = v_user_id;
  delete from public.transacciones where user_id = v_user_id;

  insert into public.deudas (user_id, entidad, tipo, saldo, tasa_ea, cuota_mensual, fuente)
  values
    (v_user_id, 'Tarjeta de crédito Bancolombia', 'tarjeta', 6400000, 28.5, 1050000, 'manual'),
    (v_user_id, 'Crédito de libre inversión Davivienda', 'libre inversión', 4100000, 17.2, 100000, 'manual');

  -- 4 meses de ingreso y de gasto por categoría.
  insert into public.transacciones (user_id, fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza)
  select
    v_user_id,
    (date '2026-05-05' + (n || ' month')::interval)::date,
    3200000, 'ingreso', 'ABONO NOMINA', 'Nómina', 'salario', 'Bancolombia Ahorros', 'gmail', 0.98
  from generate_series(0, 3) as n;

  insert into public.transacciones (user_id, fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza)
  select
    v_user_id,
    (date '2026-05-08' + (n || ' month')::interval)::date,
    c.monto, 'gasto', c.raw, c.norm, c.categoria, 'Bancolombia Ahorros', 'gmail', c.confianza
  from generate_series(0, 3) as n
  cross join (values
    (1100000, 'PAGO PSE ARRIENDO INMOB', 'Inmobiliaria', 'arriendo', 0.95),
    ( 520000, 'COMPRA EXITO POBLADO MED', 'Éxito', 'mercado', 0.93),
    ( 240000, 'COMPRA PSE *DLO*UBER BOG', 'Uber', 'transporte', 0.88),
    (1150000, 'PAGO CUOTA TARJETA CREDITO', 'Bancolombia', 'cuotas de deuda', 0.97),
    ( 180000, 'COMPRA PSE *DLO*RAPPI BOG', 'Rappi', 'domicilios', 0.91),
    ( 145000, 'PAGO PSE EPM SERVICIOS', 'EPM', 'servicios', 0.94)
  ) as c(monto, raw, norm, categoria, confianza);

  -- Gasto deliberadamente sin categorizar, para que el MCP tenga algo real
  -- que reportar en calidad_datos y advertencias.
  insert into public.transacciones (user_id, fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza)
  select
    v_user_id,
    (date '2026-05-14' + (n || ' month')::interval)::date,
    175000, 'gasto', 'COMPRA PSE *DLO*MP BOG', null, null, 'Bancolombia Ahorros', 'gmail', 0.41
  from generate_series(0, 3) as n;

  -- DIAN y DataCrédito ya "conectados" (mismos datos de fixture que
  -- web/src/lib/conectores/catalogo.ts), para que los expertos de Crédito,
  -- Tributario y Riesgo tengan algo real que leer sin tener que pasar por el
  -- guion de conexión manualmente en cada demo.
  delete from public.hallazgos_financieros where user_id = v_user_id and fuente in ('datacredito', 'dian');
  delete from public.conexiones_fuente where user_id = v_user_id and fuente_id in ('datacredito', 'dian');

  insert into public.hallazgos_financieros (user_id, tipo, fuente, procedencia, periodo, datos, confianza)
  values
    (v_user_id, 'credit_report', 'datacredito', 'observado', '2026-08',
     jsonb_build_object('score', 712, 'obligaciones_activas', 3, 'entidad', 'DataCrédito Experian'), 0.95),
    (v_user_id, 'tax_profile', 'dian', 'observado', '2025',
     jsonb_build_object('responsabilidades', array['Declarante de renta'], 'obligaciones_pendientes', 0), 0.92),
    (v_user_id, 'income', 'dian', 'observado', '2025',
     jsonb_build_object('concepto', 'Ingreso declarado (exógena)', 'valor_anual', 72000000), 0.85);

  insert into public.conexiones_fuente (user_id, fuente_id, estado, paso_actual, resultado_resumen, iniciado_en, completado_en)
  values
    (v_user_id, 'datacredito', 'completed', 0, jsonb_build_object('mensaje', 'Reporte crediticio encontrado.', 'hallazgos', 1), now(), now()),
    (v_user_id, 'dian', 'completed', 0, jsonb_build_object('mensaje', 'RUT e información exógena encontrados.', 'hallazgos', 2), now(), now());

  -- Tenencias de inversión declaradas a mano (no hay conector real todavía),
  -- para que el experto de inversiones tenga algo concreto que discutir en
  -- vez de siempre caer en el caso de "no tienes nada conectado".
  delete from public.hallazgos_financieros where user_id = v_user_id and fuente = 'manual' and tipo = 'asset';

  insert into public.hallazgos_financieros (user_id, tipo, fuente, procedencia, periodo, datos, confianza)
  values
    (v_user_id, 'asset', 'manual', 'declarado', '2026-08',
     jsonb_build_object('tipo_activo', 'CDT', 'entidad', 'Bancolombia', 'valor_estimado', 8000000), 0.8),
    (v_user_id, 'asset', 'manual', 'declarado', '2026-08',
     jsonb_build_object('tipo_activo', 'Fondo de inversión colectiva', 'entidad', 'Fiduciaria Bancolombia', 'valor_estimado', 4500000), 0.7);
end $$;
