"use client";

import NextLink, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "./ui/sidebar";

export default function Link({
  className,
  ...props
}: LinkProps & React.HTMLAttributes<HTMLAnchorElement>) {
  const pathname = usePathname() ?? "";
  const hrefPath = typeof props.href === "string" ? props.href.split(/[?#]/, 1)[0] : props.href.pathname ?? "";
  const normalizedHref = hrefPath.length > 1 ? hrefPath.replace(/\/+$/, "") : hrefPath;
  const isCurrentPath = pathname === normalizedHref || (
    normalizedHref !== "/" &&
    normalizedHref !== "/helpdesk" &&
    pathname.startsWith(`${normalizedHref}/`)
  );

  return (
    <SidebarMenuButton
      asChild
      isActive={isCurrentPath}
      className={`transition-all ease-linear duration-200 ${className ?? ""}`}
    >
      <NextLink {...props} aria-current={isCurrentPath ? "page" : undefined} />
    </SidebarMenuButton>
  );
}
