import { WebPlugin } from '@capacitor/core';
import type { LineLoginOptions, LineLoginPlugin, LineLoginResult, LineLoginSetupOptions } from './definitions';
export declare class LineLoginWeb extends WebPlugin implements LineLoginPlugin {
    setup(_options: LineLoginSetupOptions): Promise<void>;
    login(_options: LineLoginOptions): Promise<LineLoginResult>;
    isAvailable(): Promise<{
        available: boolean;
    }>;
}
//# sourceMappingURL=web.d.ts.map