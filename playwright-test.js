const { firefox } = require('playwright');

const BASE_URL = 'http://localhost:8888';

async function runTests() {
  // Use existing Firefox installation
  const browser = await firefox.launch({ 
    headless: true,
    executablePath: '/data01/home/xuzk/.cache/ms-playwright/firefox-1509/firefox/firefox'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  try {
    console.log('=== Test 1: Load main page ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✓ Main page loaded');

    const title = await page.title();
    console.log(`  Page title: ${title}`);

    console.log('\n=== Test 2: Check service cards ===');
    const serviceCards = await page.locator('[class*="card"], [class*="service"]').count();
    console.log(`  Found ${serviceCards} card/service elements`);

    // Get service names from the page
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log(`  Headings: ${headings.slice(0, 5).join(', ')}`);

    console.log('\n=== Test 3: Navigate to Paper Agent ===');
    // Try clicking on any link containing 'paper' or 'ba79eb8f'
    const links = await page.locator('a[href*="ba79eb8f"]').all();
    if (links.length > 0) {
      await links[0].click();
      await page.waitForTimeout(2000);
      console.log(`  URL after click: ${page.url()}`);
      if (page.url().includes('ba79eb8f')) {
        console.log('✓ Navigated to Paper Agent');
      }
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/ba79eb8f/`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      const title2 = await page.title();
      console.log(`  Direct nav title: ${title2}`);
      if (title2.includes('Paper')) {
        console.log('✓ Paper Agent SPA loaded');
      }
    }

    console.log('\n=== Test 4: Check for console errors ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    errors.push(error.message);
  } finally {
    await browser.close();
  }

  console.log('\n========== Summary ==========');
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s):`);
    errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  } else {
    console.log('✓ No errors');
  }
  console.log('=============================');

  return errors.length === 0;
}

runTests().then(success => process.exit(success ? 0 : 1))
  .catch(err => { console.error('Fatal:', err); process.exit(1); });
