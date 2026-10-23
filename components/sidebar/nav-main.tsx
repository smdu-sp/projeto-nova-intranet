/** @format */

import {
  Building2,
  CalendarSearch,
  ChevronRight,
  House,
  LucideProps,
  Users,
  ClipboardCheck,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import Link from "../link";
import { listarPermissoes, verificarDesenvolvedor } from "@/services/permissoes/";

export async function NavMain() {
  const mostraAdmin = await verificarDesenvolvedor();
  interface IMenu {
    icone: ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
    >;
    titulo: string;
    url?: string;
    permissao?: string;
    apenasDesenvolvedor?: boolean;
    subItens?: ISubMenu[];
  }

  interface ISubMenu {
    titulo: string;
    url: string;
  }

  const permissoes = await listarPermissoes();

  const menuUsuario: IMenu[] = [
    {
      icone: House,
      titulo: "Página Inicial",
      url: "/",
    }
  ];

  const menuModulos: IMenu[] = [
    {
      icone: CalendarSearch,
      titulo: "Reservas de Salas",
      url: "/reserva-salas",
      permissao: "reserva_salas.reservas.visualizar",
    },
    {
      icone: ClipboardCheck,
      titulo: "Avaliação de Limpeza",
      url: "/avaliacao-limpeza",
      apenasDesenvolvedor: true,
    },
  ];
  const setPermissoes = new Set(permissoes);
  const menuModulosFiltrados = menuModulos.filter((item) => {
    if (item.apenasDesenvolvedor) return mostraAdmin;
    if (!item.permissao) return true;
    return setPermissoes.has(item.permissao);
  });

  const menuAdmin: IMenu[] = [
    {
      icone: Users,
      titulo: "Usuários",
      url: "/usuarios"
    },
    {
      icone: Building2,
      titulo: "Coordenadorias",
      url: "/coordenadorias"
    },
    {
      icone: ClipboardCheck,
      titulo: "Permissões",
      url: "/permissoes"
    },
  ];

  return (
    <SidebarContent>
      <SidebarGroup className="space-y-2">
        {menuAdmin && mostraAdmin && (
          <>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarMenu>
              {menuAdmin.map((item) =>
                item.subItens ? (
                  <Collapsible
                    key={item.titulo}
                    asChild
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.titulo}>
                          {item.icone && <item.icone />}
                          <span>{item.titulo}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItens?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.titulo}>
                              <Link href={subItem.url}>
                                <span>{subItem.titulo}</span>
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.titulo} className="z-50">
                    <Link href={item.url || "#"}>
                      {item.icone && <item.icone />}
                      <span>{item.titulo}</span>
                    </Link>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </>
        )}

        {menuUsuario && (
          <>
            <SidebarGroupLabel>Geral</SidebarGroupLabel>
            <SidebarMenu>
              {menuUsuario.map((item: IMenu) =>
                item.subItens ? (
                  <Collapsible
                    key={item.titulo}
                    asChild
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.titulo}>
                          {item.icone && <item.icone />}
                          <span>{item.titulo}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItens?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.titulo}>
                              <Link href={subItem.url}>
                                <span>{subItem.titulo}</span>
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.titulo} className="z-50">
                    <Link href={item.url || "#"}>
                      {item.icone && <item.icone />}
                      <span>{item.titulo}</span>
                    </Link>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </>
        )}
      {menuModulosFiltrados && (
          <>
            <SidebarGroupLabel>Módulos</SidebarGroupLabel>
            <SidebarMenu>
              {menuModulosFiltrados.map((item: IMenu) =>
                item.subItens ? (
                  <Collapsible
                    key={item.titulo}
                    asChild
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.titulo}>
                          {item.icone && <item.icone />}
                          <span>{item.titulo}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItens?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.titulo}>
                              <Link href={subItem.url}>
                                <span>{subItem.titulo}</span>
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.titulo} className="z-50">
                    <Link href={item.url || "#"}>
                      {item.icone && <item.icone />}
                      <span>{item.titulo}</span>
                    </Link>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </>
        )}
      </SidebarGroup>
    </SidebarContent>
  );
}