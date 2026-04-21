
import React from 'react';
import { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const getActiveTab = (screen: Screen): Screen => {
    if (screen === 'event-details') return 'explore';
    return screen;
  };

  const tabs: { id: Screen; label: string; icon: string }[] = [
    { id: 'explore', label: 'События', icon: '⭐' },
    { id: 'booking', label: 'Тренировки', icon: '🧘' },
    { id: 'challenges', label: 'Старт', icon: '🏃' },
    { id: 'profile', label: 'Моё', icon: '👤' },
  ];

  const activeTab = getActiveTab(currentScreen);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-mewego-neutral/30 flex justify-around items-center h-20 safe-area-bottom z-50 px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex flex-col items-center justify-center w-full h-full transition-all gap-1 ${
            activeTab === tab.id ? 'text-mewego-accent' : 'text-mewego-text/30'
          }`}
        >
          <span className={`text-xl transition-transform ${activeTab === tab.id ? 'scale-110' : 'grayscale-0'}`}>
            {tab.icon}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-tight ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
