import { Capacitor } from '@capacitor/core';
import './landing.css';

// The Android app launches straight into the game. The public website keeps its landing page.
if (Capacitor.isNativePlatform()) {
  window.location.replace(new URL('./play.html', window.location.href).toString());
}
