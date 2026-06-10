"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, Bot, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { NotificationBell } from "./notification-bell";
import { SearchTrigger } from "./command-palette";

export function Topbar({
  user,
  companyName,
}: {
  user: { name?: string | null; email?: string | null };
  companyName: string;
}) {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Otwórz menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{companyName}</p>
        <p className="truncate text-xs text-muted-foreground">System sprzedaży i pozyskiwania</p>
      </div>

      <SearchTrigger />

      <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
        <Link href="/copilot">
          <Bot className="h-4 w-4" />
          Copilot
        </Link>
      </Button>

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar>
              <AvatarFallback>{initials(user.name ?? user.email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{user.name ?? "Konto"}</p>
            <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Ustawienia
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/copilot">
              <Bot className="h-4 w-4" />
              Copilot AI
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
            Wyloguj
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
