"use client";

import { ReactNode, useState } from "react";
import { BarChart3, CreditCard, FolderTree, LayoutDashboard, X } from "lucide-react";
import Header from "./Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MainLayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  sidebarTitle?: string;
}

export type TabValue = 'dashboard' | 'accounts' | 'transactions' | 'categories';

interface TabConfig {
  value: TabValue;
  label: string;
  icon: ReactNode;
}

const tabs: TabConfig[] = [
  {
    value: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  {
    value: 'accounts',
    label: 'Cuentas',
    icon: <CreditCard className="h-4 w-4" />
  },
  {
    value: 'transactions',
    label: 'Transacciones',
    icon: <BarChart3 className="h-4 w-4" />
  },
  {
    value: 'categories',
    label: 'Categorías',
    icon: <FolderTree className="h-4 w-4" />
  }
];

interface MainLayoutWithTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  tabContents: Record<TabValue, ReactNode>;
}

export default function MainLayout({ 
  activeTab, 
  onTabChange, 
  tabContents 
}: MainLayoutWithTabsProps) {

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Contents */}
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                {tabContents[tab.value]}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

    </div>
  );
}

