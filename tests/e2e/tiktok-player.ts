import type { Page } from "@playwright/test";

// Only the external player boundary is mocked; the app, iframe, MessageEvent
// origin/source checks, UI and playback store are real.
export async function installTikTokPlayerMock(page: Page) {
  await page.route("https://www.tiktok.com/player/v1/**", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><body style="margin:0;background:#000;color:white">TikTok test player<script>
      const send = (type, value) => parent.postMessage({ 'x-tiktok-player': true, type, value }, '*');
      addEventListener('message', ({ data }) => {
        if (!data || data['x-tiktok-player'] !== true) return;
        if (data.type === 'play') send('onStateChange', 1);
        if (data.type === 'test:state') send('onStateChange', data.value);
        if (data.type === 'test:error') send('onPlayerError', data.value);
      });
      const play = document.createElement('button');
      play.textContent = 'Play preview';
      play.onclick = () => send('onStateChange', 1);
      document.body.append(play);
      const fail = document.createElement('button');
      fail.textContent = 'Unavailable preview';
      fail.onclick = () => send('onPlayerError', { errorCode: 1001, errorType: 'INVALID_VIDEO' });
      document.body.append(fail);
      setTimeout(() => send('onPlayerReady'), 50);
    </script></body></html>`,
  }));
}
export async function sendTikTokState(page: Page, value: number) {
  await page.locator('iframe[src*="tiktok.com/player/v1/"]').evaluate((node, value) => {
    (node as HTMLIFrameElement).contentWindow?.postMessage({ "x-tiktok-player": true, type: "test:state", value }, "https://www.tiktok.com");
  }, value);
}
