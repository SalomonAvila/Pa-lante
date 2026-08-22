"use client";

import { useState } from "react";
import { CATALOGO_FUENTES } from "@/lib/conectores/catalogo";
import type { CampoAdicional, ConexionFuente, EstadoConexion } from "@/lib/conectores/tipos";
import type { PayloadAccion } from "@/lib/conectores/orquestador";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const ESTADO_LABEL: Record<EstadoConexion, string> = {
  pending: "En cola",
  preparing: "Preparando",
  requires_registration: "Necesita registro",
  requires_login: "Iniciando sesión",
  requires_password_recovery: "Necesita recuperar acceso",
  requires_user_action: "Necesita un dato",
  requires_captcha: "Necesita verificación",
  requires_otp: "Esperando código",
  processing: "Procesando",
  extracting: "Extrayendo información",
  completed: "Completado",
  completed_no_data: "Sin registros",
  failed: "No se pudo completar",
  temporarily_unavailable: "No disponible por ahora",
};

export const ESTADO_COLOR: Record<EstadoConexion, string> = {
  pending: "text-on-surface-variant",
  preparing: "text-tertiary",
  requires_registration: "text-tertiary",
  requires_login: "text-tertiary",
  requires_password_recovery: "text-tertiary",
  requires_user_action: "text-tertiary",
  requires_captcha: "text-tertiary",
  requires_otp: "text-tertiary",
  processing: "text-tertiary",
  extracting: "text-tertiary",
  completed: "text-positive",
  completed_no_data: "text-on-surface-variant",
  failed: "text-error",
  temporarily_unavailable: "text-error",
};

const ESTADOS_ESPERA: EstadoConexion[] = [
  "requires_registration",
  "requires_password_recovery",
  "requires_captcha",
  "requires_otp",
];

function AccionRegistroCampos({
  campos,
  onResolver,
}: {
  campos: CampoAdicional[];
  onResolver: (payload: PayloadAccion) => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>({});

  if (campos.length === 0) {
    return (
      <Button onClick={() => onResolver({ accion: "registro_campos", valores: {} })}>
        Crear cuenta con mis datos
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onResolver({ accion: "registro_campos", valores });
      }}
      className="flex flex-col gap-2"
    >
      {campos.map((campo) => (
        <Input
          key={campo.clave}
          label={campo.etiqueta}
          value={valores[campo.clave] ?? ""}
          onChange={(e) => setValores((v) => ({ ...v, [campo.clave]: e.target.value }))}
          required
        />
      ))}
      <Button type="submit" className="self-start">
        Enviar
      </Button>
    </form>
  );
}

function AccionOtp({ onResolver }: { onResolver: (payload: PayloadAccion) => void }) {
  const [codigo, setCodigo] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onResolver({ accion: "otp", codigo });
      }}
      className="flex items-end gap-2"
    >
      <Input
        label="Código"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        required
        className="w-24"
      />
      <Button type="submit">Verificar</Button>
    </form>
  );
}

function AccionPendiente({
  conexion,
  onResolver,
}: {
  conexion: ConexionFuente;
  onResolver: (payload: PayloadAccion) => void;
}) {
  switch (conexion.estado) {
    case "requires_registration":
      return (
        <AccionRegistroCampos campos={conexion.campoSolicitado?.campos ?? []} onResolver={onResolver} />
      );
    case "requires_password_recovery":
      return (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-on-surface-variant">
            Ya tienes una cuenta. Podemos ayudarte a iniciar el proceso oficial de recuperación de
            contraseña.
          </p>
          <Button onClick={() => onResolver({ accion: "iniciar_recuperacion" })} className="self-start">
            Recuperar acceso
          </Button>
        </div>
      );
    case "requires_captcha":
      return <Button onClick={() => onResolver({ accion: "captcha" })}>Confirma que eres tú</Button>;
    case "requires_otp":
      return <AccionOtp onResolver={onResolver} />;
    default:
      return null;
  }
}

type Props = {
  conexiones: ConexionFuente[];
  onResolverAccion: (conexionId: string, payload: PayloadAccion) => void;
  onReintentar: (conexionId: string) => void;
  onDesconectar?: (conexionId: string) => void;
};

export function TablaFuentes({ conexiones, onResolverAccion, onReintentar, onDesconectar }: Props) {
  return (
    <Table>
      <Thead>
        <tr>
          <Th>Fuente</Th>
          <Th>Estado</Th>
          <Th>Acción</Th>
        </tr>
      </Thead>
      <tbody>
        {conexiones.map((conexion) => {
          const fuente = CATALOGO_FUENTES.find((f) => f.id === conexion.fuenteId);
          const enEspera = ESTADOS_ESPERA.includes(conexion.estado);

          return (
            <Tr key={conexion.id}>
              <Td>
                <div className="font-medium">{fuente?.nombre ?? conexion.fuenteId}</div>
                <div className="text-sm text-on-surface-variant">{conexion.mensaje}</div>
              </Td>
              <Td>
                <span className={`label-sm ${ESTADO_COLOR[conexion.estado]}`}>
                  {ESTADO_LABEL[conexion.estado]}
                </span>
              </Td>
              <Td>
                {enEspera && (
                  <AccionPendiente
                    conexion={conexion}
                    onResolver={(payload) => onResolverAccion(conexion.id, payload)}
                  />
                )}
                {conexion.estado === "failed" && (
                  <Button variant="secondary" onClick={() => onReintentar(conexion.id)}>
                    Reintentar
                  </Button>
                )}
                {(conexion.estado === "completed" || conexion.estado === "completed_no_data") &&
                  onDesconectar && (
                    <button
                      type="button"
                      onClick={() => onDesconectar(conexion.id)}
                      className="label-sm text-on-surface-variant underline"
                    >
                      Desconectar
                    </button>
                  )}
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
