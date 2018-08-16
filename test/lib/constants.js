import ports from '../tasks/ports.json';

export const BASE_URL = '//localhost:' + ports.base + '/test/spec/';
export const BASE_XD_URL = '//localhost:' + ports.crossdomain + '/test/spec/';

export const CHROME_APP = 'Tradeshift.Chrome';
export const NOT_FOUND_APP = 'Tradeshift.NotFound';

export const TOPIC_BEFORE_CONNECT = 'before-connect';
export const TOPIC_AFTER_CONNECT = 'after-connect';
