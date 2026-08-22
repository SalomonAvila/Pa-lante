/**
 * Departamentos de Colombia y una selección curada de municipios por cada
 * uno (capital + las ciudades más grandes). NO es el listado DANE completo
 * (1100+ municipios) — para el registro de la hackathon alcanza con esto;
 * ampliar esta lista no requiere tocar ningún componente, solo estos datos.
 */
export type Departamento = {
  nombre: string;
  municipios: string[];
};

export const DEPARTAMENTOS: Departamento[] = [
  { nombre: "Amazonas", municipios: ["Leticia", "Puerto Nariño"] },
  {
    nombre: "Antioquia",
    municipios: [
      "Medellín",
      "Bello",
      "Itagüí",
      "Envigado",
      "Rionegro",
      "Apartadó",
      "Turbo",
    ],
  },
  { nombre: "Arauca", municipios: ["Arauca", "Saravena", "Tame"] },
  {
    nombre: "Atlántico",
    municipios: ["Barranquilla", "Soledad", "Malambo", "Sabanalarga"],
  },
  {
    nombre: "Bogotá, D.C.",
    municipios: ["Bogotá"],
  },
  {
    nombre: "Bolívar",
    municipios: ["Cartagena", "Magangué", "Turbaco", "El Carmen de Bolívar"],
  },
  {
    nombre: "Boyacá",
    municipios: ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"],
  },
  { nombre: "Caldas", municipios: ["Manizales", "La Dorada", "Chinchiná"] },
  { nombre: "Caquetá", municipios: ["Florencia", "San Vicente del Caguán"] },
  { nombre: "Casanare", municipios: ["Yopal", "Aguazul", "Villanueva"] },
  { nombre: "Cauca", municipios: ["Popayán", "Santander de Quilichao"] },
  {
    nombre: "Cesar",
    municipios: ["Valledupar", "Aguachica", "Codazzi"],
  },
  { nombre: "Chocó", municipios: ["Quibdó", "Istmina"] },
  {
    nombre: "Córdoba",
    municipios: ["Montería", "Lorica", "Cereté", "Sahagún"],
  },
  {
    nombre: "Cundinamarca",
    municipios: ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Girardot"],
  },
  { nombre: "Guainía", municipios: ["Inírida"] },
  { nombre: "Guaviare", municipios: ["San José del Guaviare"] },
  { nombre: "Huila", municipios: ["Neiva", "Pitalito", "Garzón"] },
  {
    nombre: "La Guajira",
    municipios: ["Riohacha", "Maicao", "Uribia"],
  },
  {
    nombre: "Magdalena",
    municipios: ["Santa Marta", "Ciénaga", "Fundación"],
  },
  {
    nombre: "Meta",
    municipios: ["Villavicencio", "Acacías", "Granada"],
  },
  { nombre: "Nariño", municipios: ["Pasto", "Tumaco", "Ipiales"] },
  {
    nombre: "Norte de Santander",
    municipios: ["Cúcuta", "Ocaña", "Pamplona"],
  },
  { nombre: "Putumayo", municipios: ["Mocoa", "Puerto Asís"] },
  { nombre: "Quindío", municipios: ["Armenia", "Calarcá", "Montenegro"] },
  {
    nombre: "Risaralda",
    municipios: ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
  },
  {
    nombre: "San Andrés y Providencia",
    municipios: ["San Andrés", "Providencia"],
  },
  {
    nombre: "Santander",
    municipios: ["Bucaramanga", "Floridablanca", "Girón", "Barrancabermeja"],
  },
  { nombre: "Sucre", municipios: ["Sincelejo", "Corozal"] },
  { nombre: "Tolima", municipios: ["Ibagué", "Espinal", "Melgar"] },
  {
    nombre: "Valle del Cauca",
    municipios: ["Cali", "Palmira", "Buenaventura", "Tuluá", "Buga"],
  },
  { nombre: "Vaupés", municipios: ["Mitú"] },
  { nombre: "Vichada", municipios: ["Puerto Carreño"] },
];

export function municipiosDe(departamento: string): string[] {
  return DEPARTAMENTOS.find((d) => d.nombre === departamento)?.municipios ?? [];
}
