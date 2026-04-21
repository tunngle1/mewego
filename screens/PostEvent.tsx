
import React from 'react';

const PostEvent: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center text-center bg-mewego-bg">
      <div className="text-6xl mb-8">🌱</div>
      <h1 className="text-3xl font-bold mb-4 leading-tight">Ваше тело говорит "спасибо"</h1>
      <p className="text-mewego-text/60 mb-12">
        Не важно, как много вы сделали. Важно, что вы нашли время для себя. Как самочувствие?
      </p>

      <div className="grid grid-cols-3 gap-4 w-full mb-12">
        {['😊 Спокойно', '💪 Бодро', '😴 Устал(а)'].map(feeling => (
          <button key={feeling} className="p-4 bg-white rounded-2xl border border-mewego-neutral text-xs font-bold hover:bg-mewego-surface transition-colors">
            {feeling}
          </button>
        ))}
      </div>

      <div className="p-6 bg-mewego-surface/20 rounded-3xl border border-mewego-neutral w-full mb-12">
        <p className="text-sm italic text-mewego-text/70">
          "Сегодня вы сделали шаг навстречу привычке. Завтра вы почувствуете это в каждом движении."
        </p>
      </div>

      <button 
        onClick={onContinue}
        className="w-full bg-mewego-accent text-white py-4 rounded-2xl font-semibold shadow-xl"
      >
        Посмотреть прогресс пути
      </button>
    </div>
  );
};

export default PostEvent;
