export const PROBLEMAS_FINANCIEROS = [
  {
    id: "entender-gastos",
    titulo: "Entender en qué se me va la plata",
    descripcion: "Ordenar mis movimientos y encontrar gastos que hoy no estoy viendo.",
    color: "menta",
    icono: "visibilidad",
  },
  {
    id: "salir-de-deudas",
    titulo: "Salir de deudas con un plan realista",
    descripcion: "Priorizar lo que debo y avanzar sin descuidar mis gastos del mes.",
    color: "durazno",
    icono: "deuda",
  },
  {
    id: "cumplir-meta",
    titulo: "Organizarme para cumplir una meta",
    descripcion: "Convertir un viaje, estudio o compra importante en pasos alcanzables.",
    color: "amarillo",
    icono: "meta",
  },
  {
    id: "vivienda",
    titulo: "Saber si puedo pagar una vivienda",
    descripcion: "Entender cuánto puedo asumir y qué tendría que preparar antes de decidir.",
    color: "lavanda",
    icono: "vivienda",
  },
  {
    id: "credito-arriendo",
    titulo: "Prepararme para un crédito o arriendo",
    descripcion: "Reunir evidencia clara de mis ingresos, obligaciones y capacidad de pago.",
    color: "azul",
    icono: "documento",
  },
  {
    id: "invertir",
    titulo: "Empezar a invertir con más criterio",
    descripcion: "Conocer mi capacidad, horizonte y riesgos antes de comparar alternativas.",
    color: "verde",
    icono: "crecimiento",
  },
] as const;

export type ProblemaFinanciero = (typeof PROBLEMAS_FINANCIEROS)[number];
export type ProblemaFinancieroId = ProblemaFinanciero["id"];

export type ProblemaSeleccionado = {
  id: ProblemaFinancieroId | "otro";
  titulo: string;
  descripcion: string;
};

export function buscarProblema(id: string): ProblemaFinanciero | undefined {
  return PROBLEMAS_FINANCIEROS.find((problema) => problema.id === id);
}
