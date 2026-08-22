"use client";

import { DEPARTAMENTOS, municipiosDe } from "@/lib/colombia/ubicaciones";
import { Select } from "@/components/ui/Select";

type Props = {
  departamento: string;
  municipio: string;
  onDepartamentoChange: (departamento: string) => void;
  onMunicipioChange: (municipio: string) => void;
};

export function DepartamentoMunicipioSelect({
  departamento,
  municipio,
  onDepartamentoChange,
  onMunicipioChange,
}: Props) {
  const municipios = municipiosDe(departamento);

  return (
    <>
      <Select
        label="Departamento"
        name="departamento"
        required
        value={departamento}
        onChange={(e) => {
          onDepartamentoChange(e.target.value);
          onMunicipioChange("");
        }}
      >
        <option value="">Selecciona un departamento</option>
        {DEPARTAMENTOS.map((d) => (
          <option key={d.nombre} value={d.nombre}>
            {d.nombre}
          </option>
        ))}
      </Select>
      <Select
        label="Municipio"
        name="municipio"
        required
        value={municipio}
        disabled={!departamento}
        onChange={(e) => onMunicipioChange(e.target.value)}
      >
        <option value="">
          {departamento ? "Selecciona un municipio" : "Primero elige un departamento"}
        </option>
        {municipios.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
    </>
  );
}
