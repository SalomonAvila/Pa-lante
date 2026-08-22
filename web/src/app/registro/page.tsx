"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DepartamentoMunicipioSelect } from "@/components/perfil/DepartamentoMunicipioSelect";
import { PasswordChecklist } from "@/components/perfil/PasswordChecklist";
import { passwordEsValida } from "@/lib/auth/password";
import { CLAVE_SESSION_REGISTRO, type DatosRegistro } from "@/lib/perfil/registro-local";

const ESTADO_INICIAL: DatosRegistro & { password: string; confirmarPassword: string } = {
  nombres: "",
  apellidos: "",
  tipoDocumento: "CC",
  numeroDocumento: "",
  fechaExpedicion: "",
  fechaNacimiento: "",
  direccion: "",
  departamento: "",
  municipio: "",
  celular: "",
  correo: "",
  tipoPersona: "natural",
  sexo: "",
  identidadGenero: "",
  password: "",
  confirmarPassword: "",
};

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const supabase = createClient();

  function set<K extends keyof typeof ESTADO_INICIAL>(campo: K, valor: (typeof ESTADO_INICIAL)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!passwordEsValida(form.password)) {
      setError("La contraseña todavía no cumple los requisitos de abajo.");
      return;
    }

    setEnviando(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.correo,
      password: form.password,
      options: { data: { nombres: form.nombres, apellidos: form.apellidos } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setEnviando(false);
      return;
    }

    const { password, confirmarPassword, ...datosPersonales } = form;
    void password;
    void confirmarPassword;
    sessionStorage.setItem(CLAVE_SESSION_REGISTRO, JSON.stringify(datosPersonales));
    router.push(`/registro/verificar-correo?correo=${encodeURIComponent(form.correo)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 py-12">
      <div>
        <h1 className="headline-md text-on-surface">Crea tu cuenta</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Con estos datos armamos tu perfil y verificamos tu identidad en los próximos pasos.
        </p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-8">
        <Card className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Identificación</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombres"
              required
              value={form.nombres}
              onChange={(e) => set("nombres", e.target.value)}
            />
            <Input
              label="Apellidos"
              required
              value={form.apellidos}
              onChange={(e) => set("apellidos", e.target.value)}
            />
            <Select
              label="Tipo de documento"
              required
              value={form.tipoDocumento}
              onChange={(e) => set("tipoDocumento", e.target.value)}
            >
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="TI">Tarjeta de identidad</option>
              <option value="PA">Pasaporte</option>
              <option value="NIT">NIT</option>
            </Select>
            <Input
              label="Número de documento"
              required
              value={form.numeroDocumento}
              onChange={(e) => set("numeroDocumento", e.target.value)}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              required
              value={form.fechaNacimiento}
              onChange={(e) => set("fechaNacimiento", e.target.value)}
            />
            <Input
              label="Fecha de expedición"
              type="date"
              required
              value={form.fechaExpedicion}
              onChange={(e) => set("fechaExpedicion", e.target.value)}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Residencia</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DepartamentoMunicipioSelect
              departamento={form.departamento}
              municipio={form.municipio}
              onDepartamentoChange={(v) => set("departamento", v)}
              onMunicipioChange={(v) => set("municipio", v)}
            />
          </div>
          <Input
            label="Dirección"
            required
            value={form.direccion}
            onChange={(e) => set("direccion", e.target.value)}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Contacto</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Correo electrónico"
              type="email"
              required
              value={form.correo}
              onChange={(e) => set("correo", e.target.value)}
            />
            <Input
              label="Celular"
              type="tel"
              required
              value={form.celular}
              onChange={(e) => set("celular", e.target.value)}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Tipo de cuenta</h2>
          <Select
            label="Tipo de persona"
            value={form.tipoPersona}
            onChange={(e) => set("tipoPersona", e.target.value as "natural" | "juridica")}
          >
            <option value="natural">Persona natural</option>
            <option value="juridica">Persona jurídica</option>
          </Select>
          {form.tipoPersona === "juridica" && (
            <p className="text-sm text-on-surface-variant">
              Después de verificar tu identidad te pediremos el NIT y la razón social de tu empresa.
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Información demográfica (opcional)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Sexo" value={form.sexo} onChange={(e) => set("sexo", e.target.value)}>
              <option value="">Prefiero no decirlo</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="no_binario">No binario</option>
            </Select>
            <Select
              label="Identidad de género"
              value={form.identidadGenero}
              onChange={(e) => set("identidadGenero", e.target.value)}
            >
              <option value="">Prefiero no responder</option>
              <option value="mujer">Mujer</option>
              <option value="hombre">Hombre</option>
              <option value="transgenero">Transgénero / transexual</option>
              <option value="no_binario">No binario</option>
              <option value="otro">Otro</option>
            </Select>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Credenciales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contraseña"
              type="password"
              required
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              required
              value={form.confirmarPassword}
              onChange={(e) => set("confirmarPassword", e.target.value)}
            />
          </div>
          <PasswordChecklist password={form.password} />
        </Card>

        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={enviando} className="self-start disabled:opacity-60">
          {enviando ? "Creando cuenta…" : "Continuar"}
        </Button>

        <p className="body-md text-on-surface-variant">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-primary underline">
            Inicia sesión
          </a>
        </p>
      </form>
    </div>
  );
}
