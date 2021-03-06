import cache from './cache';
import { getScriptsByURL } from './db';

const API_CONFIG = {
  urls: ['*://*/*'], // `*` scheme matches only http and https
  types: ['main_frame', 'sub_frame'],
};
const TIME_AFTER_SEND = 1000; // longer as establishing connection to sites may take time
const TIME_AFTER_RECEIVE = 250; // shorter as response body will be coming very soon

export function getPreinjectKey(url, isTop) {
  return `preinject${+isTop}:${url}`;
}

export function togglePreinject(enable) {
  // Using onSendHeaders because onHeadersReceived in Firefox fires *after* content scripts.
  // And even in Chrome a site may be so fast that preinject on onHeadersReceived won't be useful.
  const onOff = `${enable ? 'add' : 'remove'}Listener`;
  const config = enable ? API_CONFIG : undefined;
  browser.webRequest.onSendHeaders[onOff](preinject, config);
  browser.webRequest.onHeadersReceived[onOff](prolong, config);
}

function preinject({ url, frameId }) {
  const isTop = !frameId;
  const key = getPreinjectKey(url, isTop);
  if (!cache.has(key)) {
    // GetInjected message will be sent soon by the content script
    // and it may easily happen while getScriptsByURL is still waiting for browser.storage
    // so we'll let GetInjected await this pending data by storing Promise in the cache
    cache.put(key, getScriptsByURL(url, isTop), TIME_AFTER_SEND);
  }
}

function prolong({ url, frameId }) {
  cache.hit(getPreinjectKey(url, !frameId), TIME_AFTER_RECEIVE);
}
