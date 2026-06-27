'use client';

import { useEffect } from 'react';

type SendioThemeStep = {
  pageBg: string;
  heroBg: string;
  cardBg: string;
  rectangleBg: string;
  border: string;
  buttonBg: string;
  buttonHover: string;
};

const SENDIO_THEME_STEPS: SendioThemeStep[] = [
  {
    pageBg: '#ecf6f9',
    heroBg: '#ccedf0',
    cardBg: '#ffffff',
    rectangleBg: '#f9f0f0',
    border: '#ccedf0',
    buttonBg: '#29b9f3',
    buttonHover: '#45cfe7',
  },
  {
    pageBg: '#f9f1ef',
    heroBg: '#f9f0f0',
    cardBg: '#ffffff',
    rectangleBg: '#d4e6ef',
    border: '#ccdae7',
    buttonBg: '#45cfe7',
    buttonHover: '#29b9f3',
  },
  {
    pageBg: '#f2f3f4',
    heroBg: '#e9d4ff',
    cardBg: '#ffffff',
    rectangleBg: '#ecf6f9',
    border: '#d4e6ef',
    buttonBg: '#29b9f3',
    buttonHover: '#45cfe7',
  },
  {
    pageBg: '#f0f0f0',
    heroBg: '#d4e6ef',
    cardBg: '#ffffff',
    rectangleBg: '#ccedf0',
    border: '#ccdae7',
    buttonBg: '#45cfe7',
    buttonHover: '#29b9f3',
  },
];

const THEME_INTERVAL_MS = 120000;

function applySendioTheme(step: SendioThemeStep) {
  const root = document.documentElement;

  root.style.setProperty('--sendio-page-bg', step.pageBg);
  root.style.setProperty('--sendio-hero-bg', step.heroBg);
  root.style.setProperty('--sendio-card-bg', step.cardBg);
  root.style.setProperty('--sendio-rectangle-bg', step.rectangleBg);
  root.style.setProperty('--sendio-border', step.border);
  root.style.setProperty('--sendio-button-bg', step.buttonBg);
  root.style.setProperty('--sendio-button-hover', step.buttonHover);
}

function getStoredThemeIndex() {
  const storedIndex = window.localStorage.getItem('sendio-theme-index');
  const parsedIndex = Number(storedIndex);

  if (
    Number.isInteger(parsedIndex) &&
    parsedIndex >= 0 &&
    parsedIndex < SENDIO_THEME_STEPS.length
  ) {
    return parsedIndex;
  }

  return 0;
}

export default function SendioThemeController() {
  useEffect(() => {
    const storedMode = window.localStorage.getItem('sendio-theme-mode');
    const themeMode = storedMode === 'fixed' ? 'fixed' : 'auto';

    let currentIndex = getStoredThemeIndex();
    applySendioTheme(SENDIO_THEME_STEPS[currentIndex]);

    if (themeMode === 'fixed') {
      return;
    }

    const intervalId = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % SENDIO_THEME_STEPS.length;
      window.localStorage.setItem('sendio-theme-index', String(currentIndex));
      applySendioTheme(SENDIO_THEME_STEPS[currentIndex]);
    }, THEME_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}