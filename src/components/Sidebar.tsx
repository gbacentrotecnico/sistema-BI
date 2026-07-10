'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
    // Dispara um evento personalizado para atualizar a margem do layout
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  const menuItems = [
    { label: 'Geral', icon: '📊', href: '/' },
    { label: 'Marketing', icon: '📢', href: '/marketing-campanhas' },
    { label: 'Reativação de Base', icon: '🔁', href: '/marketing' },
    { label: 'Atendimento', icon: '💬', href: '/atendimento' },
    { label: 'Vendas', icon: '💰', href: '/vendas' },
    { label: 'RH', icon: '👥', href: '/rh', disabled: true },
    { label: 'Financeiro', icon: '💳', href: '/financeiro', disabled: true },
    { label: 'Pós Vendas', icon: '🔧', href: '/pos-vendas', disabled: true },
    { label: 'Configurações', icon: '⚙️', href: '/config' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-abucci-card border-r border-abucci-border z-40 transition-all duration-300 flex flex-col justify-between ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="flex flex-col">
        {/* Logo and Title area */}
        <div className="p-5 flex items-center justify-between border-b border-abucci-border h-20">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <img src="/logo-abucci.png" alt="Abucci" className="w-8 h-8 object-contain" />
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm text-neutral-100 uppercase tracking-wider leading-none">ABUCCI</span>
                <span className="text-[10px] text-abucci-gold font-mono tracking-widest mt-1 uppercase">BI PORTAL</span>
              </div>
            </div>
          ) : (
            <img src="/logo-abucci.png" alt="Abucci" className="w-8 h-8 object-contain mx-auto" />
          )}

          {/* Toggle Button */}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg bg-neutral-950 border border-abucci-border hover:border-abucci-gold/40 text-neutral-400 hover:text-white transition-all active:scale-95 focus:outline-none"
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const isActive = pathname === item.href;
            
            if (item.disabled) {
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg text-xs font-semibold font-display opacity-40 cursor-not-allowed`}
                  title="Em breve/desenvolvimento"
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-neutral-400">{item.label}</span>
                      <span className="text-[8px] bg-neutral-950 px-1 py-0.5 rounded font-mono border border-abucci-border">BREVE</span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg text-xs font-semibold font-display transition-all ${isActive ? 'bg-gradient-to-r from-abucci-gold/15 to-transparent text-abucci-gold border-l-2 border-abucci-gold font-bold' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/30'}`}
              >
                <span className="text-lg" title={item.label}>{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding */}
      <div className="p-5 border-t border-abucci-border text-center">
        {!isCollapsed ? (
          <span className="text-[9px] text-neutral-500 font-mono">
            © 2026 Grupo Abucci
          </span>
        ) : (
          <span className="text-[10px]" title="© 2026 Grupo Abucci">ℹ️</span>
        )}
      </div>
    </aside>
  );
}
