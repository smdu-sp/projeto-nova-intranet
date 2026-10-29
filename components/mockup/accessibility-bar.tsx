"use client";

import { useState, useEffect } from "react";
import { Contrast } from "lucide-react";

export function AccessibilityBar() {
  const [fontSize, setFontSize] = useState<number>(100);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Carrega as preferências salvas no localStorage ao montar a página
  useEffect(() => {
    const savedContrast = localStorage.getItem("highContrast") === "true";
    const savedFontSize = localStorage.getItem("fontSize");

    if (savedContrast) {
      setHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }

    if (savedFontSize) {
      const size = Number(savedFontSize);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}%`;
      document.body.style.fontSize = `${size}%`;
    }
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

  return (
    <div className="accessibility-bar bg-[#fff] text-white border-b border-zinc-800 py-1.5 px-4 text-xs select-none">
      <div className="max-w-[1180px] mx-auto flex items-center justify-end gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-black font-normal mr-1">Fonte:</span>
          <button
            onClick={() => handleFontSizeChange("decrease")}
            className="bg-white text-black font-bold px-2 py-0.5 rounded border border-zinc-700 transition-colors text-xs cursor-pointer"
            title="Diminuir fonte (A-)"
          >
            A-
          </button>
          <button
            onClick={() => handleFontSizeChange("reset")}
            className="bg-white text-black font-bold px-2.5 py-0.5 rounded border border-zinc-700 transition-colors text-xs cursor-pointer"
            title="Tamanho normal (A)"
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange("increase")}
            className="bg-white text-black font-bold px-2 py-0.5 rounded border border-zinc-700 transition-colors text-xs cursor-pointer"
            title="Aumentar fonte (A+)"
          >
            A+
          </button>
        </div>

        <button onClick={toggleHighContrast} className="flex items-center gap-2 bg-white text-black px-3 py-1 rounded border border-zinc-700 transition-colors font-medium text-xs cursor-pointer ml-2">
          <Contrast className="w-3.5 h-3.5" />
          <span>
            Alto contraste: <strong className="font-semibold">{highContrast ? "ativado" : "desativado"}</strong>
          </span>
        </button>
      </div>
    </div>
  );
}
