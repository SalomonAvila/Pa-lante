-- Pa'lante — la conversación por voz necesita poder declarar la meta/objetivo
-- financiero del usuario como un hallazgo más (ahorro, salir de deudas,
-- visibilidad), y ese caso no encajaba en ningún valor existente de
-- tipo_hallazgo (income/liability/asset/property/vehicle/credit_report/
-- pension/tax_profile/company/fine/account).

alter type public.tipo_hallazgo add value if not exists 'goal';
