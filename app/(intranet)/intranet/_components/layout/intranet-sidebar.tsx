/** @format */

"use client";

import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { IntranetNavigation } from "./intranet-navigation";
import { SupportCard } from "./support-card";

interface IntranetSidebarProps {
  supportHref?: string;
}

export function IntranetSidebar({
  supportHref = "/helpdesk/chamados/novo",
}: IntranetSidebarProps) {
  return (
    <div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacao</SidebarGroupLabel>
          <SidebarGroupContent>
            <IntranetNavigation />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SupportCard href={supportHref} />
      </SidebarFooter>
    </div>
  );
}
