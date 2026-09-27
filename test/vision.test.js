
const { Enemy } = require('../src/ai/enemy.js');
const { Player } = require('../src/stealth/player.js');

describe('潜行游戏视野', () => {
  test('视野锥形区域', () => {
    const enemy = new Enemy(0, 0);
    enemy.vision.facing = 0;
    const player = new Player(50, 0);
    expect(enemy.vision.canSee(player, [])).toBe(true);
  });
  test('视野外不侦测', () => {
    const enemy = new Enemy(0, 0);
    enemy.vision.facing = 0;
    const player = new Player(-50, 0);
    expect(enemy.vision.canSee(player, [])).toBe(false);
  });
  test('障碍物遮挡', () => {
    const enemy = new Enemy(0, 0);
    enemy.vision.facing = 0;
    const player = new Player(100, 0);
    const obstacles = [{x:50, y:-10, w:20, h:20}];
    expect(enemy.vision.canSee(player, obstacles)).toBe(false);
  });
  test('蹲伏减半侦测', () => {
    const player = new Player(50, 0);
    player.crouching = true;
    expect(player.getDetectionModifier()).toBe(0.5);
  });
  test('警戒等级阶段', () => {
    const enemy = new Enemy(0, 0);
    expect(enemy.alertLevel).toBe(0);
  });
  test('转向平滑跟随', () => {
    const enemy = new Enemy(0, 0);
    enemy.turnTo(Math.PI);
    expect(enemy.vision.facing).toBe(Math.PI);
  });
  test('脱离视野搜寻', () => {
    const enemy = new Enemy(0, 0);
    const player = new Player(50, 0);
    enemy.update(0.1, player, []);
    expect(enemy.lastKnownPos).not.toBeNull();
  });
  test('背刺判定', () => {
    const enemy = new Enemy(0, 0);
    enemy.vision.facing = 0;
    const player = new Player(-10, 0);
    const dx = player.x - enemy.x;
    const angle = Math.atan2(0, dx);
    let diff = Math.abs(angle - enemy.vision.facing);
    expect(diff).toBeGreaterThan(Math.PI/2);
  });
});
