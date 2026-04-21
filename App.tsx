
import React, { useState } from 'react';
import { Screen, Event } from './types';
import Navigation from './components/Navigation';
import Onboarding from './screens/Onboarding';
import Explore from './screens/Explore';
import EventDetails from './screens/EventDetails';
import Booking from './screens/Booking';
import Waiting from './screens/Waiting';
import PostEvent from './screens/PostEvent';
import Challenges from './screens/Challenges';
import Paywall from './screens/Paywall';
import Profile from './screens/Profile';

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Мягкое утро в парке',
    category: 'Йога-флоу',
    date: 'Завтра',
    time: '09:00',
    location: 'Парк Горького',
    intensity: 'мягко',
    price: '800 ₽',
    image: 'https://images.unsplash.com/photo-1552196564-972b2c1f8a72?auto=format&fit=crop&q=80&w=600',
    instructor: { name: 'Анна К.', rating: 4.9, avatar: 'https://i.pravatar.cc/100?u=anna' },
    description: 'Мы будем плавно просыпаться через растяжку и дыхание. Никакого давления — только вы и ваше тело.',
    vibe: ['Для новичков', 'Спокойно', 'На свежем воздухе']
  },
  {
    id: '2',
    title: 'Танцевальный импульс',
    category: 'Свободное движение',
    date: '24 Августа',
    time: '19:30',
    location: 'Студия "Воздух"',
    intensity: 'средне',
    price: '1200 ₽',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=600',
    instructor: { name: 'Марк И.', rating: 5.0, avatar: 'https://i.pravatar.cc/100?u=mark' },
    description: 'Танцуем как чувствуем. Никаких связок и сложных движений. Просто музыка и радость.',
    vibe: ['Разрядка', 'Без судейства', 'Теплый свет']
  }
];

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const navigateTo = (newScreen: Screen) => {
    setScreen(newScreen);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setScreen('event-details');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <Onboarding onComplete={() => setScreen('explore')} />;
      case 'explore':
        return <Explore events={MOCK_EVENTS} onSelectEvent={handleEventSelect} onUpgrade={() => setScreen('paywall')} />;
      case 'event-details':
        return selectedEvent ? (
          <EventDetails event={selectedEvent} onBack={() => setScreen('explore')} onBook={() => setScreen('booking')} />
        ) : <Explore events={MOCK_EVENTS} onSelectEvent={handleEventSelect} onUpgrade={() => setScreen('paywall')} />;
      case 'booking':
        // Если event не выбран, экран Booking покажет пустой список тренировок (корректное поведение вкладки)
        return <Booking event={selectedEvent || undefined} onCancel={() => setScreen('explore')} onConfirm={() => setScreen('waiting')} />;
      case 'waiting':
        return selectedEvent ? (
          <Waiting event={selectedEvent} onFinish={() => setScreen('post-event')} />
        ) : <Explore events={MOCK_EVENTS} onSelectEvent={handleEventSelect} onUpgrade={() => setScreen('paywall')} />;
      case 'post-event':
        return <PostEvent onContinue={() => setScreen('challenges')} />;
      case 'challenges':
        return <Challenges onUpgrade={() => setScreen('paywall')} onBack={() => setScreen('explore')} />;
      case 'paywall':
        return <Paywall onClose={() => setScreen('explore')} />;
      case 'profile':
        return <Profile onUpgrade={() => setScreen('paywall')} />;
      default:
        return <Explore events={MOCK_EVENTS} onSelectEvent={handleEventSelect} onUpgrade={() => setScreen('paywall')} />;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-mewego-bg font-sans">
      <main className="flex-1 overflow-y-auto pb-24">
        {renderScreen()}
      </main>
      {screen !== 'onboarding' && screen !== 'paywall' && screen !== 'waiting' && (
        <Navigation currentScreen={screen} onNavigate={navigateTo} />
      )}
    </div>
  );
};

export default App;
