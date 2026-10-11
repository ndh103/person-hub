import { useLocation } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { activeLink, HOME_LINK, HUB_APPS, type HubApp } from "./apps";
import { ThemeSwitch } from "./theme-switch";

/**
 * Hub navigation (SHELL-001/002): a persistent column from 1024px, a drawer
 * below it. `account` is the signed-in email.
 */
export function AppSidebar({ account }: { account: string | null }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader className="px-5 pt-6 pb-2 lg:pt-8">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={HOME_LINK.href}
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            onClick={() => setOpenMobile(false)}
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
              aria-hidden="true"
            >
              PH
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-base font-semibold">Personal Hub</span>
              <span className="block truncate text-sm">{account}</span>
            </span>
          </Link>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon-lg"
              className="size-11 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Close navigation"
              onClick={() => setOpenMobile(false)}
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 pt-6 lg:pt-12">
        <nav aria-label="Apps">
          <ActiveNavLinks />
        </nav>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-5 pb-6 lg:pb-8">
        <SignOutButton className="-ml-2 self-start px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        <ThemeSwitch />
      </SidebarFooter>
    </Sidebar>
  );
}

function ActiveNavLinks() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return <NavLinks activeId={activeLink(pathname)?.id ?? null} />;
}

function NavLinks({ activeId }: { activeId: string | null }) {
  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <NavItem app={HOME_LINK} active={activeId === HOME_LINK.id} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="mt-4">
        <SidebarGroupLabel
          id="apps-heading"
          className="text-xs font-semibold tracking-[0.12em] text-sidebar-foreground uppercase"
        >
          Apps
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu aria-labelledby="apps-heading">
            {HUB_APPS.map((app) => (
              <NavItem key={app.id} app={app} active={activeId === app.id} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

function NavItem({ app, active }: { app: HubApp; active: boolean }) {
  const { setOpenMobile } = useSidebar();
  const Icon = app.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className="relative h-11 gap-3 rounded-lg px-3 text-[0.9375rem] font-medium data-active:font-semibold [&_svg]:size-5"
        render={
          // A whole app is current on any of its pages, so match the path prefix.
          <Link to={app.href} activeOptions={{ exact: false, includeSearch: false }} onClick={() => setOpenMobile(false)} />
        }
      >
        {active ? (
          // Leading bar: the active state does not rely on colour alone.
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.75 rounded-full bg-sidebar-primary" />
        ) : null}
        <Icon aria-hidden="true" />
        <span>{app.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
