'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Train, Clock, Map, Activity, Database, Info } from 'lucide-react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Advocacy & Home', icon: Info },
    { href: '/schedule', label: 'Schedule Finder', icon: Clock },
    { href: '/map', label: 'Interactive Network Map', icon: Map },
    { href: '/realtime', label: 'Live Train Delays', icon: Activity },
    { href: '/data', label: 'Data Sources', icon: Database },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-primary font-bold text-lg sm:text-xl">
            <Train className="h-6 w-6 text-accent animate-pulse" />
            <span className="tracking-tight text-slate-900">SLR Transit Hub</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 text-sm font-medium transition-colors hover:text-accent ${
                    isActive ? 'text-accent border-b-2 border-accent pb-1' : 'text-slate-600 pb-1'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none md:hidden"
            aria-expanded={isOpen}
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Side Sheet Drawer (Mobile Drawer) */}
      <div
        className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay Background */}
        <div
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <div
          className={`relative w-80 max-w-full bg-white h-full p-6 shadow-2xl flex flex-col justify-between transition-transform duration-300 transform ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-primary font-bold text-lg">
                <Train className="h-6 w-6 text-accent" />
                <span className="text-slate-900">Navigation</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close Menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col space-y-4 mt-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg text-base font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-primary border-l-4 border-primary'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer */}
          <div className="pt-6 border-t border-slate-100 text-xs text-slate-500 text-center">
            SLR GTFS Open Data Engine © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}
