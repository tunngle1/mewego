
import React from 'react';
import { Event } from '../types';

interface EventDetailsProps {
  event: Event;
  onBack: () => void;
  onBook: () => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, onBack, onBook }) => {
  return (
    <div className="bg-mewego-bg min-h-full">
      <div className="relative h-72">
        <img src={event.image} className="w-full h-full object-cover" alt={event.title} />
        <button 
          onClick={onBack}
          className="absolute top-12 left-6 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-mewego-text shadow-md"
        >
          ←
        </button>
      </div>

      <div className="p-6 -mt-10 relative bg-mewego-bg rounded-t-[40px] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="px-4 py-1.5 bg-mewego-surface/30 rounded-full text-xs font-bold text-mewego-text/70 uppercase tracking-widest border border-mewego-neutral">
            {event.category}
          </div>
          <div className="text-2xl font-bold text-mewego-accent">{event.price}</div>
        </div>

        <h1 className="text-3xl font-bold text-mewego-text mb-4 leading-tight">{event.title}</h1>
        
        <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar">
          {event.vibe.map(v => (
            <span key={v} className="px-3 py-1 bg-mewego-neutral/20 rounded-lg text-xs font-medium text-mewego-text/60 whitespace-nowrap">
              #{v}
            </span>
          ))}
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-mewego-surface/20 flex items-center justify-center text-xl">🕒</div>
            <div>
              <p className="font-bold text-mewego-text">{event.date} в {event.time}</p>
              <p className="text-sm text-mewego-text/50">Длительность: 60 минут</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-mewego-surface/20 flex items-center justify-center text-xl">📍</div>
            <div>
              <p className="font-bold text-mewego-text">{event.location}</p>
              <p className="text-sm text-mewego-text/50">Приходите за 10 мин до начала</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">О чем это?</h3>
          <p className="text-mewego-text/70 leading-relaxed italic">
            "{event.description}"
          </p>
        </div>

        <div className="bg-white/50 p-6 rounded-3xl border border-mewego-neutral mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-mewego-text/40 mb-4">Ведущий процесса</h3>
          <div className="flex items-center gap-4">
            <img src={event.instructor.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt={event.instructor.name} />
            <div>
              <p className="text-xl font-bold">{event.instructor.name}</p>
              <div className="flex items-center gap-1 text-sm text-mewego-text/60">
                <span>Мастер мягких практик</span>
                <span className="mx-1">•</span>
                <span className="text-yellow-600 font-bold">{event.instructor.rating} ★</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-mewego-accent/5 p-5 rounded-3xl border border-mewego-accent/20 mb-10">
          <h3 className="font-bold text-mewego-accent mb-2">Безопасность и комфорт</h3>
          <p className="text-sm text-mewego-text/70 leading-relaxed">
            Мы проверили локацию и мастера. Если вам станет некомфортно, вы можете покинуть занятие в любой момент без объяснения причин. 
          </p>
        </div>

        <button 
          onClick={onBook}
          className="w-full bg-mewego-accent text-white py-4 rounded-2xl font-semibold text-lg shadow-xl sticky bottom-4 transition-transform active:scale-95"
        >
          Присоединиться к группе
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
