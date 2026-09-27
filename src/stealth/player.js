const { normalizeAngle } = require('../ai/vision.js');

const BACKSTAB_DISTANCE = 25;
const BACKSTAB_ARC = Math.PI * 3 / 4; // 与敌人朝向夹角超过 135° 视为正后方

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.crouching = false;
    this.inShadow = false;
  }

  // 蹲伏或在阴影中侦测距离减半，但不完全隐形
  getDetectionModifier() {
    if (this.crouching || this.inShadow) return 0.5;
    return 1;
  }

  // 背刺：玩家位于敌人正后方且距离小于阈值
  canBackstab(enemy, threshold = BACKSTAB_DISTANCE) {
    const dx = this.x - enemy.x;
    const dy = this.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= threshold) return false;
    const facing = enemy.vision ? enemy.vision.currentFacing : 0;
    const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - facing));
    return diff > BACKSTAB_ARC;
  }
}

module.exports = { Player, BACKSTAB_DISTANCE };
