/** @format */

import Breadcrumbs from "@/components/breadcrumbs";
import { DrawerMenu } from "@/components/drawer-menu";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ModeToggle } from "@/components/toggle-theme";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { verificarDesenvolvedor } from "@/services/permissoes";

export default async function RotasAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const desenvolvedor = await verificarDesenvolvedor();
  return (
    <div className="relative w-full">
      <ModeToggle className="absolute top-4 right-4 z-50" />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-visible">
          <header className="h-16 bg-muted/50 dark:bg-background shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 hidden sm:flex">
            <div className="flex items-center gap-2 px-4 min-w-0 flex-1">
              <SidebarTrigger className="shrink-0 md:hidden" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 shrink-0"
              />
              <Breadcrumbs />
            </div>
          </header>
          <div className="h-full w-full px-0 md:px-8 pb-20 md:pb-14 bg-muted/50 dark:bg-background pt-10 md:container mx-auto">
            {children}
          </div>
        </SidebarInset>
        <DrawerMenu desenvolvedor={desenvolvedor} />
      </SidebarProvider>
    </div>
  );
}
