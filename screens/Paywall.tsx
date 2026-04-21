
import React from 'react';

const Paywall: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-mewego-bg z-[100] p-8 flex flex-col overflow-y-auto">
      <button onClick={onClose} className="ml-auto text-mewego-text/40 text-2xl font-light">×</button>
      
      <div className="text-center mb-12">
        <div className="text-5xl mb-6">🤝</div>
        <h1 className="text-3xl font-bold mb-4">Поддержка процесса</h1>
        <p className="text-mewego-text/60 leading-relaxed">
          ME·WE·GO — это не просто поиск занятий. Это ваша страховка от того, чтобы всё не бросить.
        </p>
      </div>

      <div className="space-y-6 mb-12">
        {[
          { t: 'Мягкий куратор', d: 'Человек, который поможет выбрать направление и поддержит, когда лень.', i: '👥' },
          { t: 'Страховка старта', d: 'Возвращаем 50% стоимости, если вы не пришли из-за тревоги.', i: '🛡️' },
          { t: 'Секретные группы', d: 'Доступ к камерным встречам только "для своих".', i: '🔑' },
        ].map((feat, idx) => (
          <div key={idx} className="flex gap-4 items-start">
            <span className="text-2xl p-3 bg-mewego-surface/20 rounded-2xl">{feat.i}</span>
            <div>
              <h4 className="font-bold text-mewego-text">{feat.t}</h4>
              <p className="text-sm text-mewego-text/60">{feat.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[32px] border-2 border-mewego-accent shadow-xl mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-xl text-mewego-text">Месяц заботы</span>
          <span className="bg-mewego-accent text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">Хит</span>
        </div>
        <p className="text-sm text-mewego-text/50 mb-6">Все функции поддержки + 1 событие в подарок</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">1 490 ₽</span>
          <span className="text-sm text-mewego-text/40">/ месяц</span>
        </div>
      </div>

      <button className="w-full bg-mewego-accent text-white py-5 rounded-2xl font-bold text-xl shadow-2xl mb-4 active:scale-95 transition-all">
        Попробовать неделю бесплатно
      </button>
      <p className="text-center text-[10px] text-mewego-text/40 uppercase tracking-widest font-bold">
        Безопасная оплата • Отмена в любой момент
      </p>
    </div>
  );
};

export default Paywall;
