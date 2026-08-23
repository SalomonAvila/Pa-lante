-- Pa'lante — el formulario de contacto básico de /intake pide un poco más
-- que solo nombre+celular: apellidos y documento (tipo+número), porque son
-- justo lo que hace falta para identificar al usuario en las integraciones
-- reales más adelante (DIAN, DataCrédito). Sigue sin ser el KYC completo de
-- `personas` (sin fecha de nacimiento, dirección exacta, etc.).
alter table public.contacto_basico rename column nombre to nombres;

alter table public.contacto_basico
  add column apellidos text not null default '',
  add column tipo_documento tipo_documento,
  add column numero_documento text,
  add column ciudad text;

alter table public.contacto_basico alter column apellidos drop default;
