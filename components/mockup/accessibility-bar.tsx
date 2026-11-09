"use client";

import { useState, useEffect } from "react";
import { Contrast } from "lucide-react";

export function AccessibilityBar() {
  const [fontSize, setFontSize] = useState<number>(100);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Carrega as preferências salvas no localStorage ao montar a página e limpa ao desmontar do módulo mockup
  useEffect(() => {
    const savedContrast = localStorage.getItem("highContrast") === "true";
    const savedFontSize = localStorage.getItem("fontSize");

    if (savedContrast) {
      setHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }

    if (savedFontSize) {
      const size = Number(savedFontSize);
      if (!Number.isNaN(size) && size >= 85 && size <= 140) {
        setFontSize(size);
        document.documentElement.style.fontSize = `${size}%`;
        document.body.style.fontSize = `${size}%`;
      }
    }

    return () => {
      document.documentElement.classList.remove("high-contrast");
      document.documentElement.style.fontSize = "";
      document.body.style.fontSize = "";
    };
  }, []);

  // Aplica alteração do tamanho da fonte e salva
  const handleFontSizeChange = (action: "decrease" | "reset" | "increase") => {
    let newSize = fontSize;
    if (action === "decrease") {
      newSize = Math.max(85, fontSize - 10);
    } else if (action === "increase") {
      newSize = Math.min(140, fontSize + 10);
    } else {
      newSize = 100;
    }
    setFontSize(newSize);
    localStorage.setItem("fontSize", String(newSize));
    document.documentElement.style.fontSize = `${newSize}%`;
    document.body.style.fontSize = `${newSize}%`;
  };

  // Alterna o modo de alto contraste e salva
  const toggleHighContrast = () => {
    const nextState = !highContrast;
    setHighContrast(nextState);
    localStorage.setItem("highContrast", String(nextState));

    if (nextState) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  const isDecreased = fontSize < 100;
  const isDefault = fontSize === 100;
  const isIncreased = fontSize > 100;

  return (
    <div
      role="region"
      aria-label="Barra de ferramentas de acessibilidade"
      className="accessibility-bar bg-white text-black border-b border-gray-200 py-1.5 px-4 text-xs select-none"
    >
      <div className="max-w-[1180px] mx-auto flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-700 font-medium mr-1">
            Fonte ({fontSize}%):
          </span>
          <button
            type="button"
            onClick={() => handleFontSizeChange("decrease")}
            disabled={fontSize <= 85}
            aria-label="Diminuir fonte"
            aria-pressed={isDecreased}
            className={`font-bold px-2 py-0.5 rounded border transition-colors text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDecreased
                ? "bg-[#1f7a3d] text-white border-[#1f7a3d]"
                : "bg-white text-black border-zinc-700 hover:bg-gray-100"
            }`}
            title="Diminuir fonte (A-)"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => handleFontSizeChange("reset")}
            aria-label="Tamanho padrão da fonte (100%)"
            aria-pressed={isDefault}
            className={`font-bold px-2.5 py-0.5 rounded border transition-colors text-xs cursor-pointer ${
              isDefault
                ? "bg-[#1f7a3d] text-white border-[#1f7a3d]"
                : "bg-white text-black border-zinc-700 hover:bg-gray-100"
            }`}
            title="Tamanho normal (A)"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => handleFontSizeChange("increase")}
            disabled={fontSize >= 140}
            aria-label="Aumentar fonte"
            aria-pressed={isIncreased}
            className={`font-bold px-2 py-0.5 rounded border transition-colors text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isIncreased
                ? "bg-[#1f7a3d] text-white border-[#1f7a3d]"
                : "bg-white text-black border-zinc-700 hover:bg-gray-100"
            }`}
            title="Aumentar fonte (A+)"
          >
            A+
          </button>
        </div>

        <button
          type="button"
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          className="flex items-center gap-2 bg-white hover:bg-gray-100 text-black px-3 py-1 rounded border border-zinc-700 transition-colors font-medium text-xs cursor-pointer"
        >
          <Contrast className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            Alto contraste:{" "}
            <strong className="font-semibold">
              {highContrast ? "ativado" : "desativado"}
            </strong>
          </span>
        </button>
      </div>
    </div>
  );
}
