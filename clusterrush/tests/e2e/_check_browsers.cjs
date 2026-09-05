// One-off check: which playwright browsers are installed locally.
const { chromium, firefox, webkit } = require('@playwright/test');
for (const [name, b] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  try {
    console.log(name, '->', b.executablePath());
  } catch (e) {
    console.log(name, 'ERR:', e.message.split('\n')[0]);
  }
}
