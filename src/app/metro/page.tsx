import React from 'react';
import type { Metadata } from 'next';
import MetroLiveViewer from '@/components/metro/MetroLiveViewer';

export const metadata: Metadata = {
  title: 'LMT Metro Live Fleet Telemetry • 1-Page Visual Map Demo',
  description:
    'Real-time interactive network map of Lanka Metro Transit (LMT) across the 7 CM corridors with 5-second GPS telemetry and live seat crowding status.',
};

export default function MetroPage() {
  return (
    <main className="w-screen h-screen h-dvh overflow-hidden bg-[#0b0f19]">
      <MetroLiveViewer />
    </main>
  );
}
