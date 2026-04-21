
import React from 'react';

interface ProfileProps {
  onUpgrade: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onUpgrade }) => {
  const menuItems = [
    { title: 'Мои уведомления', icon: '🔔', detail: 'Включены' },
    { title: 'Способы оплаты', icon: '💳', detail: '**** 4242' },
    { title: 'Служба поддержки', icon: '💬', detail: 'На связи' },
    { title: 'О приложении', icon: 'ℹ️', detail: 'v2.4.0' },
  ];

  return (
    <div className="p-6 pb-32">
      <header className="flex justify-between items-center mb-8 mt-4 px-2">
        <h1 className="text-2xl font-black">Профиль</h1>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">⚙️</button>
      </header>

      {/* User Card */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-mewego-neutral/30 mb-8 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-mewego-primary p-1">
            <img src="https://i.pravatar.cc/150?u=me" className="w-full h-full rounded-full object-cover" alt="me" />
          </div>
          <div className="absolute bottom-0 right-0 bg-mewego-accent text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm">PRO</div>
        </div>
        <h2 className="text-xl font-bold mb-1">Алексей Мягкий</h2>
        <p className="text-sm text-mewego-text/40 mb-6">alex.mewego@mail.ru</p>
        
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-mewego-bg rounded-3xl p-4 text-center">
            <span className="block text-xl font-black text-mewego-primary">12</span>
            <span className="text-[9px] uppercase font-bold text-mewego-text/40 tracking-widest">Занятий</span>
          </div>
          <div className="bg-mewego-bg rounded-3xl p-4 text-center">
            <span className="block text-xl font-black text-mewego-accent">4.8к</span>
            <span className="text-[9px] uppercase font-bold text-mewego-text/40 tracking-widest">Мягкость</span>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="bg-mewego-surface/10 rounded-[32px] p-6 border border-mewego-neutral/30 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Подписка активна</h3>
          <span className="text-[10px] font-bold text-mewego-primary uppercase">До 12.09</span>
        </div>
        <p className="text-xs text-mewego-text/60 mb-6">Ваш мягкий куратор Катерина на связи и готова помочь с выбором направления.</p>
        <button onClick={onUpgrade} className="text-sm font-bold text-mewego-accent underline decoration-2 underline-offset-4">Управление подпиской</button>
      </div>

      {/* Menu List */}
      <div className="space-y-3">
        {menuItems.map((item, i) => (
          <button key={i} className="w-full bg-white p-5 rounded-3xl flex items-center justify-between border border-mewego-neutral/20 shadow-sm active:bg-mewego-bg transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-xl">{item.icon}</span>
              <span className="font-bold text-sm">{item.title}</span>
            </div>
            <span className="text-[10px] font-bold text-mewego-text/30 uppercase">{item.detail}</span>
          </button>
        ))}
      </div>

      <button className="w-full mt-10 py-5 text-mewego-accent font-bold text-xs uppercase tracking-[0.2em] opacity-40">
        Выйти из аккаунта
      </button>
    </div>
  );
};

export default Profile;
