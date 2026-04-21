
export type Screen = 'onboarding' | 'explore' | 'event-details' | 'booking' | 'waiting' | 'post-event' | 'challenges' | 'paywall' | 'profile';

export interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  intensity: 'мягко' | 'средне' | 'активно';
  price: string;
  image: string;
  instructor: {
    name: string;
    rating: number;
    avatar: string;
  };
  description: string;
  vibe: string[];
}
