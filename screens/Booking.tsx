
import React, { useState } from 'react';
import { Event } from '../types';

interface BookingProps {
  event?: Event;
  onCancel: () => void;
  onConfirm: () => void;
}

const Booking: React.FC<BookingProps> = ({ event, onCancel, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  // If accessed via Tab (no specific event)
  if (!event) {
    return (
      <div className="p-8 flex flex-col h-full bg-mewego-bg items-center justify-center text-center">
        <div className="text-6xl mb-6">🗓️</div>
        <h2 className="text-2xl font-bold mb-4">Ваше расписание пусто</h2>
        <p className="text-mewego-text/50 mb-8 leading-relaxed">
          Вы еще не записались ни на одно занятие. Самое время выбрать что-то мягкое для души.
        </p>
        <button 
          onClick={onCancel} // Goes back to explore
          className="bg-mewego-primary text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-mewego-primary/20"
        >
          Найти событие
        </button>
      </div>
    );
  }

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConfirm();
    }, 1500);
  };

  return (
    <div className="p-8 flex flex-col h-full bg-mewego-bg">
      <header className="mb-8">
        <button onClick={onCancel} className="text-mewego-text/50 mb-4 flex items-center gap-2">
          <span className="text-xl">←</span> Отмена
        </button>
        <h1 className="text-2xl font-bold">Подтверждение</h1>
        <p className="text-mewego-text/60">Мы забронируем за вами место</p>
      </header>

      <div className="bg-white/40 p-6 rounded-3xl border border-mewego-neutral mb-8 shadow-sm">
        <div className="flex justify-between mb-4 pb-4 border-b border-mewego-neutral/30">
          <span className="text-mewego-text/50 text-sm">Событие</span>
          <span className="font-bold text-sm text-right">{event.title}</span>
        </div>
        <div className="flex justify-between mb-4 pb-4 border-b border-mewego-neutral/30">
          <span className="text-mewego-text/50 text-sm">Время</span>
          <span className="font-bold text-sm">{event.date}, {event.time}</span>
        </div>
        <div className="flex justify-between text-xl pt-2">
          <span className="font-bold">К оплате</span>
          <span className="font-bold text-mewego-accent">{event.price}</span>
        </div>
      </div>

      <div className="space-y-4 mb-auto">
        <div className="bg-mewego-primary/5 p-4 rounded-2xl border border-mewego-primary/20 text-[10px] text-mewego-text/60 leading-relaxed">
           💡 <strong>ME·WE·GO СОВЕТ:</strong> Не волнуйтесь, если передумаете. Мы возвращаем полную стоимость при отмене за 12 часов. Нам важно, чтобы вы чувствовали себя спокойно.
        </div>
      </div>

      <button 
        disabled={loading}
        onClick={handlePay}
        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all ${loading ? 'bg-mewego-neutral cursor-wait' : 'bg-mewego-primary text-white active:scale-95 shadow-mewego-primary/20'}`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          'Записаться'
        )}
      </button>
    </div>
  );
};

export default Booking;
