import { useState } from 'react';
import { ReviewProvider } from './state/ReviewContext';
import HomeScreen from './screens/HomeScreen';
import ReviewScreen from './screens/ReviewScreen';
import AuditPacketScreen from './screens/AuditPacketScreen';

type Screen = 'home' | 'review' | 'audit-packet';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <ReviewProvider>
      <div className="min-h-screen bg-surface text-foreground">
        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'review' && <ReviewScreen onNavigate={setScreen} />}
        {screen === 'audit-packet' && <AuditPacketScreen onNavigate={setScreen} />}
      </div>
    </ReviewProvider>
  );
}