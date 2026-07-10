'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Função para ler o estado do collapse
  const updateState = () => {
    const saved = localStorage.getItem('sidebar-collapsed');
    setIsCollapsed(saved === 'true');
  };

  useEffect(() => {
    updateState();
    
    // Escuta o evento do botão de toggle da Sidebar
    window.addEventListener('sidebar-toggle', updateState);
    return () => {
      window.removeEventListener('sidebar-toggle', updateState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-abucci-dark flex">
      {/* Barra Lateral Fixa */}
      <Sidebar />

      {/* Conteúdo Principal */}
      <main
        className={`flex-1 transition-all duration-300 min-h-screen ${isCollapsed ? 'pl-20' : 'pl-64'}`}
      >
        {children}
      </main>
    </div>
  );
}
