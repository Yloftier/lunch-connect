'use client';

import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import OnboardingGender from './components/OnboardingGender';
import OnboardingDetail from './components/OnboardingDetail';
import MainScreen from './components/MainScreen';

type Screen = 'login' | 'onboarding_gender' | 'onboarding_detail' | 'main';

export default function Home() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lunch_user');
      return saved ? 'main' : 'login';
    }
    return 'login';
  });
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lunch_user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [loginData, setLoginData] = useState({ name: '', birth: '' });
  const [gender, setGender] = useState('');

  return (
    <>
      {screen === 'login' && (
        <LoginScreen
        onExistingUser={(user) => { 
          localStorage.setItem('lunch_user', JSON.stringify(user));
          setUser(user); 
          setScreen('main'); 
        }}
          onNewUser={(data) => { setLoginData(data); setScreen('onboarding_gender'); }}
        />
      )}

      {screen === 'onboarding_gender' && (
        <OnboardingGender
          name={loginData.name}
          onSelect={(g) => { setGender(g); setScreen('onboarding_detail'); }}
        />
      )}

      {screen === 'onboarding_detail' && (
        <OnboardingDetail
          loginData={loginData}
          gender={gender}
          onComplete={(user) => { 
            localStorage.setItem('lunch_user', JSON.stringify(user));
            setUser(user); 
            setScreen('main'); 
          }}
        />
      )}

      {screen === 'main' && (
        <MainScreen user={user} />
      )}
    </>
  );
}