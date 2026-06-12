import { mount } from 'svelte';
import './app.css';
import App from './ui/App.svelte';

const target = document.getElementById('app');
if (target === null) throw new Error('Missing #app element');

// offline-start voor de geïnstalleerde app; in dev zit Vite ertussen en is
// een service worker alleen maar in de weg
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // registratie is best-effort: zonder worker speelt alles gewoon online
    });
  });
}

export default mount(App, { target });
