import { WebPlugin } from '@capacitor/core';
export class LineLoginWeb extends WebPlugin {
    async setup(_options) {
        throw this.unavailable('LineLogin is not available on web');
    }
    async login(_options) {
        throw this.unavailable('LineLogin is not available on web');
    }
    async isAvailable() {
        throw this.unavailable('LineLogin is not available on web');
    }
}
//# sourceMappingURL=web.js.map