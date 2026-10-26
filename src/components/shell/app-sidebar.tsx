import { useLocation } from "@tanstack/react-router";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { activeLink, HOME_LINK, HUB_APPS, type HubApp } from "./apps";
import { ThemeSwitch, ThemeToggleButton } from "./theme-switch";

/**
 * Hub navigation (SHELL-001/002): a persistent column from 1024px, a drawer
 * below it. On desktop it collapses to an icon rail to give wide pages such as
 * the Week board more room. `account` is the signed-in email.
 */
export function AppSidebar({ account }: { account: string | null }) {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-5 pt-6 pb-2 lg:pt-8 group-data-[collapsible=icon]:px-2">
        <div className="flex items-start justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <Link
            to={HOME_LINK.href}
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label={collapsed ? "Personal Hub home" : undefined}
            onClick={() => setOpenMobile(false)}
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
              aria-hidden="true"
            >
              PH
            </span>
            <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="block font-heading text-lg font-medium">Personal Hub</span>
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
          ) : (
            <CollapseButton collapsed={collapsed} />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 pt-6 lg:pt-12 group-data-[collapsible=icon]:px-0">
        <nav aria-label="Apps">
          <ActiveNavLinks />
        </nav>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-5 pb-6 lg:pb-8 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <SignOutButton
          className="-ml-2 self-start px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:self-center group-data-[collapsible=icon]:p-0"
          labelClassName="group-data-[collapsible=icon]:sr-only"
        />
        {collapsed ? <ThemeToggleButton /> : <ThemeSwitch />}
      </SidebarFooter>
    </Sidebar>
  );
}

/** Desktop only: collapses the sidebar to its icon rail and back (also Ctrl/Cmd+B). */
function CollapseButton({ collapsed }: { collapsed: boolean }) {
  const { toggleSidebar } = useSidebar();
  const label = collapsed ? "Expand navigation" : "Collapse navigation";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={label}
            aria-expanded={!collapsed}
            onClick={toggleSidebar}
          />
        }
      >
        {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
      </TooltipTrigger>
      <TooltipContent side="right">{label} (Ctrl+B)</TooltipContent>
    </Tooltip>
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
          className="font-mono text-xs font-medium tracking-[0.12em] text-sidebar-foreground uppercase"
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
        // The tooltip only shows on the collapsed rail, where the label is clipped.
        tooltip={app.label}
        className="relative h-11 gap-3 rounded-lg px-3 text-[0.9375rem] font-medium data-active:font-semibold group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-3! [&_svg]:size-5"
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
