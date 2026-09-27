

class Enemy {
  constructor(x, y) {
    this.x=x; this.y=y; this.vision = new Vision(Math.PI/2, 100);
    this.vision.x = x; this.vision.y = y;
    this.alertLevel = 0; // 0=none, 1=suspect, 2=search, 3=alert
    this.lastKnownPos = null;
  }
  update(dt, player, obstacles) {
    // BUG: 转向时视野跳变
    if (this.vision.canSee(player, obstacles)) {
      this.alertLevel = 3;
      this.lastKnownPos = {x: player.x, y: player.y};
    }
  }
  turnTo(angle) {
    this.vision.facing = angle; // BUG: 不平滑
  }
}

module.exports = { Enemy };
