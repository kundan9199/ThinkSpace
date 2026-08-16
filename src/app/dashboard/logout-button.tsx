"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logoutAction();
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      isLoading={isLoading}
      onClick={handleLogout}
      leftIcon={<LogOut className="h-4 w-4" />}
    >
      Logout
    </Button>
  );
}
