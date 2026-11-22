import { WebPlugin } from '@capacitor/core';

import type {
  LineLoginOptions,
  LineLoginPlugin,
  LineLoginResult,
  LineLoginSetupOptions,
} from './definitions';

export class LineLoginWeb extends WebPlugin implements LineLoginPlugin {
  async setup(_options: LineLoginSetupOptions): Promise<void> {
    throw this.unavailable('LineLogin is not available on web');
  }

  async login(_options: LineLoginOptions): Promise<LineLoginResult> {
    throw this.unavailable('LineLogin is not available on web');
  }

  async isAvailable(): Promise<{ available: boolean }> {
    throw this.unavailable('LineLogin is not available on web');
  }
}
