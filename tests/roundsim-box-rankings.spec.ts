import { test, expect } from './fixtures';

test.describe('Box Rankings & Item Simulation', () => {

  // ── Verify BattleMovedex has selfdestruct flags ───────────────
  // These flags are used by the box ranking engine to exclude self-KO moves

  test('Self-Destruct is flagged selfdestruct', async ({ rsaPage }) => {
    const flag = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['selfdestruct'];
      return m ? !!m.selfdestruct : false;
    });
    expect(flag).toBe(true);
  });

  test('Explosion is flagged selfdestruct', async ({ rsaPage }) => {
    const flag = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['explosion'];
      return m ? !!m.selfdestruct : false;
    });
    expect(flag).toBe(true);
  });
});

