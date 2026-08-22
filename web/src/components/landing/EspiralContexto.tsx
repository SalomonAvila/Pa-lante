"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Espiral de contexto.
 *
 * No es decoración: las partículas nacen dispersas al azar —el contexto
 * financiero tirado en correos y PDFs— y se ordenan en una espiral que sube.
 * Esa transición ES el producto, y ocurre en los primeros dos segundos, que
 * es todo el tiempo que un jurado le va a dar a esta pantalla.
 */

const PARTICULAS = 2600;
const VUELTAS = 4.2;
const ALTURA = 11;
const RADIO = 4.4;
const DURACION_MS = 2600;

// Easing suave al final: arranca rápido y se asienta, en vez de frenar seco.
function suavizar(t: number): number {
  return 1 - Math.pow(1 - t, 3.2);
}

export function EspiralContexto() {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(
      52,
      nodo.clientWidth / nodo.clientHeight,
      0.1,
      100,
    );
    camara.position.set(0, 0, 17.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(nodo.clientWidth, nodo.clientHeight);
    // Cap del DPR: en un portátil de demo, 3x mata los fps sin ganancia visible.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    nodo.appendChild(renderer.domElement);

    const disperso = new Float32Array(PARTICULAS * 3);
    const ordenado = new Float32Array(PARTICULAS * 3);
    const posicion = new Float32Array(PARTICULAS * 3);
    const colores = new Float32Array(PARTICULAS * 3);
    const tamanos = new Float32Array(PARTICULAS);

    // Sobre fondo navy, cualquier tono oscuro desaparece. La rampa va de
    // ámbar profundo a crema encendido: siempre por encima del fondo.
    const ambar = new THREE.Color("#c9761a");
    const dorado = new THREE.Color("#f2a93c");
    const crema = new THREE.Color("#fff2d9");
    const verde = new THREE.Color("#6fbf95");

    for (let i = 0; i < PARTICULAS; i++) {
      const i3 = i * 3;

      // Origen: nube caótica, deliberadamente más ancha que la espiral.
      disperso[i3] = (Math.random() - 0.5) * 26;
      disperso[i3 + 1] = (Math.random() - 0.5) * 20;
      disperso[i3 + 2] = (Math.random() - 0.5) * 16;

      // Destino: espiral ascendente, con un poco de ruido para que no se vea
      // como un alambre perfecto de tutorial.
      const t = i / PARTICULAS;
      const angulo = t * Math.PI * 2 * VUELTAS;
      const radio = RADIO * (0.55 + t * 0.45) + (Math.random() - 0.5) * 0.55;
      ordenado[i3] = Math.cos(angulo) * radio;
      ordenado[i3 + 1] = (t - 0.5) * ALTURA + (Math.random() - 0.5) * 0.35;
      ordenado[i3 + 2] = Math.sin(angulo) * radio;

      posicion[i3] = reduce ? ordenado[i3] : disperso[i3];
      posicion[i3 + 1] = reduce ? ordenado[i3 + 1] : disperso[i3 + 1];
      posicion[i3 + 2] = reduce ? ordenado[i3 + 2] : disperso[i3 + 2];

      // Ámbar abajo (de donde vienes), crema encendido arriba (la meta).
      const mezcla =
        t < 0.5
          ? new THREE.Color().lerpColors(ambar, dorado, t * 2)
          : new THREE.Color().lerpColors(dorado, crema, (t - 0.5) * 2);
      if (Math.random() < 0.08) mezcla.lerp(verde, 0.7);
      colores[i3] = mezcla.r;
      colores[i3 + 1] = mezcla.g;
      colores[i3 + 2] = mezcla.b;

      tamanos[i] = Math.random() < 0.14 ? 0.24 : 0.105;
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute("position", new THREE.BufferAttribute(posicion, 3));
    geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
    geometria.setAttribute("size", new THREE.BufferAttribute(tamanos, 1));

    // Shader propio: puntos redondos con caída suave. El material por defecto
    // da cuadrados duros que se ven baratos.
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      // Aditivo: donde la espiral se densifica, la luz se acumula y se
      // forma un núcleo brillante. Es lo que la hace ver viva y no plana.
      blending: THREE.AdditiveBlending,
      uniforms: { uEscala: { value: nodo.clientHeight * 0.9 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uEscala;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uEscala / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.08, d);
          gl_FragColor = vec4(vColor, alpha * 0.95);
        }
      `,
      vertexColors: true,
    });

    const puntos = new THREE.Points(geometria, material);
    escena.add(puntos);

    let frame = 0;
    const inicio = performance.now();

    function animar(ahora: number) {
      const transcurrido = ahora - inicio;

      if (!reduce && transcurrido < DURACION_MS) {
        const k = suavizar(Math.min(transcurrido / DURACION_MS, 1));
        for (let i = 0; i < PARTICULAS * 3; i++) {
          posicion[i] = disperso[i] + (ordenado[i] - disperso[i]) * k;
        }
        geometria.attributes.position.needsUpdate = true;
      }

      // Rotación lenta y perpetua: da vida sin pedir atención.
      puntos.rotation.y = reduce ? 0.4 : ahora * 0.00009;
      puntos.rotation.z = Math.sin(ahora * 0.00006) * 0.06;

      renderer.render(escena, camara);
      frame = requestAnimationFrame(animar);
    }
    frame = requestAnimationFrame(animar);

    function alRedimensionar() {
      if (!nodo) return;
      camara.aspect = nodo.clientWidth / nodo.clientHeight;
      camara.updateProjectionMatrix();
      renderer.setSize(nodo.clientWidth, nodo.clientHeight);
      material.uniforms.uEscala.value = nodo.clientHeight * 0.9;
    }
    window.addEventListener("resize", alRedimensionar);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", alRedimensionar);
      geometria.dispose();
      material.dispose();
      renderer.dispose();
      nodo.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={contenedor} aria-hidden className="absolute inset-0" />;
}
