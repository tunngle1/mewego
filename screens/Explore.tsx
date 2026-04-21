
import React from 'react';
import { Event } from '../types';

interface ExploreProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onUpgrade: () => void;
}

const Explore: React.FC<ExploreProps> = ({ events, onSelectEvent, onUpgrade }) => {
  return (
    <div className="p-5">
      <header className="flex justify-between items-center mb-8 mt-4">
        <div>
          <h1 className="text-2xl font-black text-mewego-text tracking-tight flex items-center gap-2">
            ME·WE·GO
          </h1>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-mewego-neutral/50 shadow-sm flex items-center gap-2">
           <span className="text-mewego-accent text-lg">🌱</span>
           <span className="font-bold text-sm">Уровень 2</span>
        </div>
      </header>

      {/* Categories Grid - Soft Style */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="h-40 bg-mewego-surface/30 rounded-[32px] p-5 relative overflow-hidden border border-mewego-neutral/20 shadow-inner">
          <h3 className="font-bold text-lg leading-tight">Мягкие<br/>зарядки</h3>
          <span className="absolute bottom-2 right-2 text-4xl opacity-40">🧘‍♀️</span>
        </div>
        <div className="h-40 bg-mewego-accent/10 rounded-[32px] p-5 relative overflow-hidden border border-mewego-accent/10 shadow-inner">
          <h3 className="font-bold text-lg leading-tight">Ритм<br/>сердца</h3>
          <span className="absolute bottom-2 right-2 text-4xl opacity-40">💓</span>
        </div>
        <div className="col-span-2 h-36 bg-mewego-primary/10 rounded-[32px] p-5 relative overflow-hidden border border-mewego-primary/10 shadow-inner flex items-center">
          <div className="flex-1">
            <h3 className="font-bold text-xl">Вечерний баланс</h3>
            <p className="text-xs text-mewego-text/50">4 занятия для крепкого сна</p>
          </div>
          <span className="text-5xl mr-4 opacity-50">🌙</span>
        </div>
      </div>

      <div className="flex justify-between items-end mb-6">
        <h2 className="text-xl font-bold">Ближайшее в городе</h2>
        <button className="text-xs font-bold text-mewego-accent uppercase tracking-widest">Все</button>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div 
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className="flex bg-white rounded-[28px] p-3 gap-4 border border-mewego-neutral/50 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
              <img src={event.image} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="font-bold text-sm leading-snug mb-2">{event.title}</h4>
              <div className="flex items-center justify-between text-[10px] text-mewego-text/50 uppercase font-bold tracking-wider">
                <span>📍 {event.location}</span>
                <span className="text-mewego-accent">{event.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 brand-gradient rounded-[32px] text-white shadow-xl shadow-mewego-primary/20">
        <h3 className="font-bold mb-1">Забота о процессе</h3>
        <p className="text-xs opacity-80 mb-4">Подписка поможет не сойти с пути и найти поддержку куратора.</p>
        <button 
          onClick={onUpgrade}
          className="w-full bg-white text-mewego-text py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
        >
          Узнать больше
        </button>
      </div>
    </div>
  );
};

export default Explore;
