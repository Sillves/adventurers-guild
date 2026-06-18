import { mount } from 'svelte';
import './app.css';
import App from './ui/App.svelte';

const target = document.getElementById('app');
if (target === null) throw new Error('Missing #app element');

// Vraag de browser om onze opslag duurzaam te maken. Standaard is localStorage
// "best-effort": vooral Chrome op Android mag het wissen zodra de app sluit of er
// geheugendruk is — dan staat je guild bij terugkomst weer op 0. persist() opt-in
// hiertegen. Geïnstalleerde PWA's krijgen het gratis; een losse tab op basis van
// engagement. Best-effort en stil: lukt het niet, dan speelt alles gewoon door.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((already) => (already ? undefined : navigator.storage.persist()))
    .catch(() => {
      // geen Storage-API of geweigerd: niets aan te doen vanuit code
    });
}

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
