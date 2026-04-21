
import React from 'react';
import { Event } from '../types';

interface WaitingProps {
  event: Event;
  onFinish: () => void;
}

const Waiting: React.FC<WaitingProps> = ({ event, onFinish }) => {
  return (
    <div className="p-8 flex flex-col h-full bg-mewego-bg items-center text-center justify-center">
      <div className="relative mb-12">
        <div className="w-48 h-48 bg-mewego-surface rounded-full flex items-center justify-center animate-pulse">
           <span className="text-6xl">✨</span>
        </div>
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-mewego-accent rounded-full border-4 border-mewego-bg flex items-center justify-center text-white font-bold">1</div>
      </div>
      
      <h1 className="text-3xl font-bold mb-4">Вы в списке!</h1>
      <p className="text-mewego-text/60 mb-8 max-w-xs">
        Ваше место в группе {event.title} подтверждено. Мастер уже готовится к встрече.
      </p>

      <div className="bg-white p-6 rounded-[32px] border border-mewego-neutral w-full mb-12 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-mewego-text/30 mb-4">Что дальше?</h3>
        <ul className="text-left space-y-4">
          <li className="flex gap-4 items-start">
            <span className="text-xl">📫</span>
            <p className="text-sm text-mewego-text/70">Мы пришлем напоминание за 2 часа до начала в Telegram.</p>
          </li>
          <li className="flex gap-4 items-start">
            <span className="text-xl">👟</span>
            <p className="text-sm text-mewego-text/70">Специальная одежда не нужна — главное, чтобы вам было удобно.</p>
          </li>
        </ul>
      </div>

      <button 
        onClick={onFinish}
        className="text-mewego-accent font-bold text-lg hover:underline underline-offset-8 transition-all"
      >
        Перейти в личный кабинет →
      </button>
      
      {/* Hidden dev toggle */}
      <div className="mt-8 opacity-10 cursor-pointer" onClick={onFinish}>[ Симуляция завершения события ]</div>
    </div>
  );
};

export default Waiting;
