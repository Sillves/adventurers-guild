import { mount } from 'svelte';
import './app.css';
import App from './ui/App.svelte';

const target = document.getElementById('app');
if (target === null) throw new Error('Missing #app element');

export default mount(App, { target });
