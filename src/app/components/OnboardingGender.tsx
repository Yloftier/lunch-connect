'use client';

import React from 'react';

interface Props {
  name: string;
  onSelect: (gender: string) => void;
}

export default function OnboardingGender({ name, onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-orange-100">
        <div className="text-center mb-8">
          <span className="text-5xl">👋</span>
          <h1 className="text-2xl font-bold mt-3 text-gray-800">처음 오셨군요!</h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="font-semibold text-orange-500">{name}</span>님, 성별을 선택해주세요
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('남')}
            className="py-8 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-center"
          >
            <div className="text-4xl mb-2">👨</div>
            <div className="font-bold text-gray-700">남성</div>
          </button>
          <button
            onClick={() => onSelect('여')}
            className="py-8 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-center"
          >
            <div className="text-4xl mb-2">👩</div>
            <div className="font-bold text-gray-700">여성</div>
          </button>
        </div>
      </div>
    </div>
  );
}