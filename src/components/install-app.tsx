"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Invitación a instalar oktienda.cl en el teléfono.
 *
 * En Android el navegador avisa cuándo se puede instalar y entonces mostramos el
 * botón. En iPhone no existe ese aviso: Safari solo instala desde "Compartir →
 * Agregar a inicio", así que ahí se explican los pasos.
 *
 * Si la persona la cierra, no vuelve a aparecer: nada peor que un cartel que
 * insiste en cada visita.
 */
export function InstallApp() {
  const [evento, setEvento] = useState<PromptEvent | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem("oktienda:instalar-oculto") === "1") return;
    } catch {
      // Sin acceso al almacenamiento se muestra igual: no es crítico.
    }

    // Ya está instalada: no tiene sentido ofrecerlo.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function alPoderInstalar(event: Event) {
      event.preventDefault();
      setEvento(event as PromptEvent);
      setOculto(false);
    }

    window.addEventListener("beforeinstallprompt", alPoderInstalar);

    // La barra aparece unos segundos después de cargar, no encima del contenido
    // que la persona vino a ver.
    const espera = setTimeout(() => {
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        setEsIOS(true);
        setOculto(false);
      }
    }, 2500);

    return () => {
      clearTimeout(espera);
      window.removeEventListener("beforeinstallprompt", alPoderInstalar);
    };
  }, []);

  function cerrar() {
    setOculto(true);
    try {
      localStorage.setItem("oktienda:instalar-oculto", "1");
    } catch {
      // Si no se puede guardar, volverá a aparecer. Aceptable.
    }
  }

  if (oculto || (!evento && !esIOS)) return null;

  return (
    <div className="border-b border-brand-200 bg-brand-50">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Download className="size-5 shrink-0 text-brand-700" />

        <p className="min-w-0 flex-1 text-sm text-brand-900">
          {esIOS ? (
            <>
              Instala oktienda.cl en tu iPhone: toca <Share className="inline size-4" /> y luego
              “Agregar a pantalla de inicio”.
            </>
          ) : (
            "Instala oktienda.cl en tu teléfono y recibe avisos de tus subastas."
          )}
        </p>

        {evento && (
          <button
            type="button"
            onClick={async () => {
              await evento.prompt();
              await evento.userChoice;
              cerrar();
            }}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Instalar
          </button>
        )}

        <button
          type="button"
          onClick={cerrar}
          aria-label="No mostrar de nuevo"
          className="shrink-0 rounded-lg p-1.5 text-brand-800 hover:bg-brand-100"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
