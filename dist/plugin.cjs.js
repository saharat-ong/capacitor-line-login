'use strict';

var core = require('@capacitor/core');

const LineLogin = core.registerPlugin('LineLogin', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.LineLoginWeb()),
});

class LineLoginWeb extends core.WebPlugin {
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

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    LineLoginWeb: LineLoginWeb
});

exports.LineLogin = LineLogin;
//# sourceMappingURL=plugin.cjs.js.map
