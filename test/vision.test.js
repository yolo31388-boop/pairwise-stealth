
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

const { AlertSystem, ALERT_STAGES, SEARCH_DURATION } = require('../src/ai/enemy.js');

describe('视野不变量（新增）', () => {
  test('视野锥形区域：锥内边缘可见、锥外邻近不可见', () => {
    const enemy = new Enemy(0, 0); // 锥角 PI/2，半角 PI/4
    const inside = new Player(Math.cos(0.7) * 50, Math.sin(0.7) * 50); // 0.7 < PI/4
    const outside = new Player(Math.cos(0.8) * 50, Math.sin(0.8) * 50); // 0.8 > PI/4
    expect(enemy.vision.canSee(inside, [])).toBe(true);
    expect(enemy.vision.canSee(outside, [])).toBe(false);
  });

  test('转向平滑跟随：逐帧逼近目标朝向，不跳变', () => {
    const enemy = new Enemy(0, 0);
    enemy.turnTo(Math.PI);
    enemy.update(0.1, null, []);
    expect(enemy.vision.currentFacing).toBeGreaterThan(0);
    expect(enemy.vision.currentFacing).toBeLessThan(Math.PI);
    for (let i = 0; i < 20; i++) enemy.update(0.1, null, []);
    expect(enemy.vision.currentFacing).toBe(Math.PI);
  });

  test('转向平滑跟随：沿最短弧转向，不绕远路', () => {
    const enemy = new Enemy(0, 0);
    enemy.turnTo(-Math.PI / 2);
    enemy.update(0.05, null, []);
    expect(enemy.vision.currentFacing).toBeLessThan(0);
    expect(enemy.vision.currentFacing).toBeGreaterThan(-Math.PI / 2);
  });

  test('视野边界角度：左右边界等于朝向加减半角', () => {
    const enemy = new Enemy(0, 0);
    expect(enemy.vision.getLeftBoundary()).toBeCloseTo(-Math.PI / 4);
    expect(enemy.vision.getRightBoundary()).toBeCloseTo(Math.PI / 4);
    enemy.turnTo(Math.PI / 2);
    for (let i = 0; i < 20; i++) enemy.update(0.1, null, []);
    expect(enemy.vision.getLeftBoundary()).toBeCloseTo(Math.PI / 4);
    expect(enemy.vision.getRightBoundary()).toBeCloseTo(3 * Math.PI / 4);
  });

  test('障碍物遮挡：遮挡物不在视线上时仍可看见', () => {
    const enemy = new Enemy(0, 0);
    const player = new Player(50, 0);
    const offPath = [{ x: 20, y: 30, w: 10, h: 10 }];
    expect(enemy.vision.canSee(player, offPath)).toBe(true);
    const onPath = [{ x: 20, y: -5, w: 10, h: 10 }];
    expect(enemy.vision.canSee(player, onPath)).toBe(false);
  });

  test('视野内侦测：update 后进入警觉并记录位置', () => {
    const enemy = new Enemy(0, 0);
    const player = new Player(50, 5);
    enemy.update(0.1, player, []);
    expect(enemy.alertLevel).toBe(3);
    expect(enemy.lastKnownPos).toEqual({ x: 50, y: 5 });
  });

  test('蹲伏减半侦测：中距离蹲伏不可见、近距离仍可见', () => {
    const enemy = new Enemy(0, 0); // 未警觉视野 80，蹲伏有效 40
    const far = new Player(60, 0);
    expect(enemy.vision.canSee(far, [])).toBe(true);
    far.crouching = true;
    expect(enemy.vision.canSee(far, [])).toBe(false);
    const near = new Player(30, 0);
    near.inShadow = true;
    expect(enemy.vision.canSee(near, [])).toBe(true);
  });

  test('背刺判定：正后方近距可背刺，正面或过远不可', () => {
    const enemy = new Enemy(0, 0);
    const behind = new Player(-10, 0);
    expect(behind.canBackstab(enemy)).toBe(true);
    const front = new Player(10, 0);
    expect(front.canBackstab(enemy)).toBe(false);
    const tooFar = new Player(-100, 0);
    expect(tooFar.canBackstab(enemy)).toBe(false);
  });

  test('警戒等级阶段：各阶段视野范围与移动速度递增', () => {
    const enemy = new Enemy(0, 0);
    const ranges = [];
    const speeds = [];
    for (let level = 0; level < 4; level++) {
      enemy.alertLevel = level;
      ranges.push(enemy.visionRange);
      speeds.push(enemy.moveSpeed);
    }
    expect(ranges).toEqual([80, 100, 120, 150]);
    expect(speeds).toEqual([30, 45, 60, 90]);
    expect(ALERT_STAGES.map(s => s.name)).toEqual(['unaware', 'suspect', 'search', 'alert']);
  });

  test('警报共享位置：一名敌人发现玩家，全员获得最后已知位置', () => {
    const shared = new AlertSystem();
    const a = new Enemy(0, 0, shared);
    const b = new Enemy(500, 500, shared); // 远离玩家，自己看不到
    b.turnTo(Math.PI); // 且背对玩家方向
    const player = new Player(50, 0);
    a.update(0.1, player, []);
    b.update(0.1, player, []);
    expect(b.lastKnownPos).toEqual({ x: 50, y: 0 });
    expect(b.alertLevel).toBeGreaterThanOrEqual(2);
  });

  test('脱离视野搜寻：失去目标后保持搜寻，超时后逐级解除', () => {
    const enemy = new Enemy(0, 0);
    const player = new Player(50, 0);
    enemy.update(0.1, player, []);
    expect(enemy.alertLevel).toBe(3);
    player.x = -500; // 脱离视野
    enemy.update(0.1, player, []);
    expect(enemy.alertLevel).toBeGreaterThan(0);
    expect(enemy.lastKnownPos).toEqual({ x: 50, y: 0 });
    const steps = Math.ceil((SEARCH_DURATION * 4) / 0.1) + 10;
    for (let i = 0; i < steps; i++) enemy.update(0.1, player, []);
    expect(enemy.alertLevel).toBe(0);
    expect(enemy.lastKnownPos).toBeNull();
  });

  test('视野外不侦测：玩家在背后时 update 不触发警报', () => {
    const enemy = new Enemy(0, 0);
    const player = new Player(-50, 0);
    enemy.update(0.1, player, []);
    expect(enemy.alertLevel).toBe(0);
    expect(enemy.lastKnownPos).toBeNull();
  });

  test('多敌人视野不重叠：各自独立朝向与侦测', () => {
    const a = new Enemy(0, 0);
    const b = new Enemy(0, 0);
    b.turnTo(Math.PI);
    for (let i = 0; i < 20; i++) b.update(0.1, null, []);
    const player = new Player(50, 0);
    expect(a.vision.canSee(player, [])).toBe(true);
    expect(b.vision.canSee(player, [])).toBe(false);
    a.turnTo(Math.PI / 2);
    expect(b.vision.facing).toBe(Math.PI);
    expect(a.vision.facing).toBe(Math.PI / 2);
  });
});
