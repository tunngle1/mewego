
import React from 'react';

interface ChallengesProps {
  onUpgrade: () => void;
  onBack: () => void;
}

const Challenges: React.FC<ChallengesProps> = ({ onUpgrade, onBack }) => {
  const communityProgress = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    avatar: `https://i.pravatar.cc/100?u=user${i}`,
    progress: 30 + Math.random() * 60
  }));

  return (
    <div className="p-6 pb-32">
      <header className="flex items-center justify-between mb-8 mt-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-xl">←</button>
        <h1 className="text-xl font-bold">Ваш путь</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="bg-white p-8 rounded-[40px] border border-mewego-neutral/50 mb-8 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-mewego-primary/10 rounded-full -translate-y-12 translate-x-12" />
        <h2 className="text-sm font-bold text-mewego-accent uppercase tracking-widest mb-2">Уровень 2</h2>
        <div className="text-3xl font-black text-mewego-text mb-4">Искатель комфорта</div>
        <div className="w-full h-3 bg-mewego-neutral/20 rounded-full overflow-hidden mb-2">
          <div className="w-[45%] h-full brand-gradient shadow-lg" />
        </div>
        <p className="text-[10px] font-bold text-mewego-text/40 uppercase tracking-tighter">450 / 1000 опыта • До следующего уровня 3 дня</p>
      </div>

      <div className="space-y-4 mb-10">
        <h3 className="font-bold text-lg px-2">Цели сообщества</h3>
        <div className="bg-mewego-surface/10 rounded-[32px] p-6 border border-mewego-neutral/30">
          <div className="grid grid-cols-5 gap-4">
            {communityProgress.map((user) => (
              <div key={user.id} className="relative aspect-square">
                <svg className="absolute inset-0 w-full h-full -rotate-90 scale-110">
                  <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#D0D4C5" strokeWidth="2" opacity="0.2"/>
                  <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#e8336c" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - user.progress} strokeLinecap="round"/>
                </svg>
                <img src={user.avatar} className="w-full h-full rounded-full object-cover border-2 border-white" alt="user" />
              </div>
            ))}
          </div>
          <button className="w-full mt-6 text-mewego-accent font-bold text-xs uppercase tracking-widest">Показать всех друзей (124)</button>
        </div>
      </div>

      <div className="bg-mewego-text text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-3">Задать новую цель?</h3>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">Система ME·WE·GO подберет для вас мягкий челлендж на неделю на основе ваших прошлых успехов.</p>
          <button onClick={onUpgrade} className="w-full bg-mewego-accent text-white py-4 rounded-2xl font-bold shadow-lg shadow-mewego-accent/30 active:scale-95 transition-transform">
            Подобрать цель
          </button>
        </div>
        <div className="absolute -bottom-10 -right-10 text-9xl opacity-10">🌱</div>
      </div>
    </div>
  );
};

export default Challenges;
