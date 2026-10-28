"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: "Início", href: "/mockup" },
    { label: "Fale conosco", href: "/mockup/fale-conosco" },
    { label: "Informações", href: "/mockup/informacoes" },
    { label: "Vídeos", href: "/mockup/videos" },
    { label: "Equipe", href: "/mockup/equipe" },
    { label: "Parcerias", href: "/mockup/parcerias" },
  ];

  const toggleMenu = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={headerRef} className="sticky top-0 z-50 bg-white shadow-sm relative">
      <header className="max-w-[1180px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image src="/mockup/logo-cipa.svg" alt="Logo CIPA SMUL" width={30} height={30} />
          <div>
            <h1 className="text-base font-bold leading-tight">CIPA SMUL</h1>
            <p className="text-[0.45rem] text-gray-600">Prevenção de acidentes e assédio</p>
          </div>
        </div>

        {/* Menu Desktop */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-2 lg:gap-4 transition-all duration-300">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname === `${item.href}/` || (item.href !== "/mockup" && pathname?.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-sm font-bold px-3 py-1.5 lg:px-4 rounded-full transition-all duration-200 block ${
                      isActive ? "bg-[#1f7a3d] text-white shadow-sm" : "text-gray-900 hover:text-green-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Botão Hamburguer Mobile */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1f7a3d] transition-colors"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Dropdown Menu Mobile em sobreposição absoluta */}
      <div
        className={`absolute top-full left-0 w-full md:hidden grid transition-all duration-300 ease-in-out bg-white border-gray-100 shadow-xl z-50 ${
          isOpen ? "grid-rows-[1fr] opacity-100 border-t py-4 pointer-events-auto" : "grid-rows-[0fr] opacity-0 border-t-0 py-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden px-6">
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname === `${item.href}/` || (item.href !== "/mockup" && pathname?.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-bold px-4 py-2.5 rounded-lg transition-all duration-200 block ${
                      isActive ? "bg-[#1f7a3d] text-white shadow-sm" : "text-gray-900 hover:bg-gray-100 hover:text-green-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
