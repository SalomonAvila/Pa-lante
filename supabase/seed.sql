-- Datos de la cuenta semilla de prueba (ficticios; PRODUCT.md prohíbe usar
-- datos reales del equipo en demos).
--
-- Uso:
--   1. Reemplaza el correo de abajo por el de la cuenta semilla del equipo.
--      TIENE que ser un buzón real: el login es por enlace mágico o Google, así
--      que un dominio inventado nunca podría entrar y el usuario jamás se
--      crearía en auth.users. Truco barato: un alias con '+' sobre el correo
--      que ya usan (ej. equipo+semilla@gmail.com) llega al mismo buzón pero
--      Supabase lo trata como usuario distinto.
--   2. Entra UNA vez a la app con ese correo, por enlace mágico (no por
--      Google: así la cuenta de demo nunca toca un Gmail real, que es
--      justamente lo que PRODUCT.md prohíbe mostrar en vivo).
--   3. Corre este archivo en el SQL Editor de Supabase.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'semilla@palante.test';

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
end $$;
