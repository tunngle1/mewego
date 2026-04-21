
import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: 'ME·WE·GO',
    subtitle: 'Двигаться — это просто',
    description: 'Забудьте про спортзалы с зеркалами. Мы верим, что каждое движение имеет значение.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800'
  },
  {
    title: 'БЕЗ ДАВЛЕНИЯ',
    subtitle: 'Твой темп — твой выбор',
    description: 'Выбирайте состояние, которое подходит вам сегодня. "Мягко" — это полноценный результат.',
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=800'
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-mewego-bg overflow-hidden">
      {/* Background Gradient similar to Ref 1 */}
      <div className="absolute inset-0 brand-gradient opacity-10 blur-3xl -z-10" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative mb-12">
          {/* Logo Circle from Ref 1 */}
          <div className="w-56 h-56 rounded-full border-[12px] border-white shadow-2xl overflow-hidden brand-gradient flex items-center justify-center">
            <img src={steps[currentStep].image} alt="onboarding" className="w-full h-full object-cover mix-blend-overlay opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-white text-4xl font-black tracking-tighter">M·W·G</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-mewego-accent font-black text-xs uppercase tracking-[0.3em]">{steps[currentStep].title}</h2>
          <h1 className="text-3xl font-bold text-mewego-text leading-tight">{steps[currentStep].subtitle}</h1>
          <p className="text-mewego-text/60 leading-relaxed text-sm max-w-xs mx-auto">
            {steps[currentStep].description}
          </p>
        </div>
      </div>
      
      <div className="p-8 pb-12 flex flex-col gap-6">
        <div className="flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-10 bg-mewego-primary' : 'w-2 bg-mewego-neutral'}`} />
          ))}
        </div>
        <button 
          onClick={next}
          className="w-full bg-mewego-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-mewego-primary/20 active:scale-[0.98] transition-all"
        >
          {currentStep === steps.length - 1 ? 'Начать' : 'Продолжить'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
