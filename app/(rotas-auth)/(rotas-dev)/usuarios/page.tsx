"use server"

import { validarPermissao } from "@/services/permissoes";
import UsuariosAdminPage from "./usuarios_page";

export default async function UsuariosPage() {
  const temPermissao = await validarPermissao("usuarios.importar");
  return <UsuariosAdminPage temPermissao={temPermissao} />;
}