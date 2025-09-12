"use client";

import { useState } from "react";
import { Menu, X, LogOut, Shield } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import PreferencesMenu from "@/components/preferences/PreferencesMenu";
import SecurityDrawer from "@/components/security/SecurityDrawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { signIn } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [securityDrawerOpen, setSecurityDrawerOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl flex h-16 items-center px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary">Logdrio</h1>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="ml-auto flex items-center space-x-4">
              <PreferencesMenu />
              {session ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={session.user?.image || undefined} 
                          alt={session.user?.name || "User"} 
                        />
                        <AvatarFallback>
                          {session.user?.name?.charAt(0).toUpperCase() || 
                           session.user?.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="end">
                    <div className="flex flex-col space-y-2">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{session.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.user?.email}
                        </p>
                      </div>
                      <div className="border-t pt-2 space-y-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => setSecurityDrawerOpen(true)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Seguridad
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => signOut()}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Cerrar sesión
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button onClick={() => signIn('google')}>
                  Iniciar sesión
                </Button>
              )}
            </nav>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <div className="ml-auto flex items-center space-x-2">
              <PreferencesMenu />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="md:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 border-b bg-background md:hidden">
          <div className="mx-auto max-w-4xl px-4 py-4">
            {session ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b pb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={session.user?.image || undefined} 
                      alt={session.user?.name || "User"} 
                    />
                    <AvatarFallback>
                      {session.user?.name?.charAt(0).toUpperCase() || 
                       session.user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      setSecurityDrawerOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Seguridad
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={() => {
                    signIn('google');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Iniciar sesión
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Drawer */}
      <SecurityDrawer 
        open={securityDrawerOpen} 
        onOpenChange={setSecurityDrawerOpen} 
      />
    </>
  );
}