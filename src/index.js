import { app } from './app';
import { hub } from './hub';
import { isChromeWindow } from './lib';

const api = isChromeWindow() ? hub : app;

export default api;
