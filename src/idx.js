import { app } from './app';
import { hub } from './hub';
import { LifecycleHandler } from './hlr';
import { SpawnError } from './err';
import { isChromeWindow } from './lib';

const api = isChromeWindow() ? hub : app;

api.LifecycleHandler = LifecycleHandler;
api.SpawnError = SpawnError;

export default api;
