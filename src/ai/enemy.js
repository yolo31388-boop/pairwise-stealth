const { Vision, normalizeAngle } = require('./vision.js');

// 警戒阶段：未警觉 / 怀疑 / 搜寻 / 警觉，各有不同的视野范围与移动速度
const ALERT_STAGES = [
  { name: 'unaware', visionRange: 80,  moveSpeed: 30 },
  { name: 'suspect', visionRange: 100, moveSpeed: 45 },
  { name: 'search',  visionRange: 120, moveSpeed: 60 },
  { name: 'alert',   visionRange: 150, moveSpeed: 90 },
];

const SEARCH_DURATION = 5; // 脱离视野后在最后已知位置搜寻的秒数

// 警报状态共享：所有敌人共享玩家最后已知位置
class AlertSystem {
  constructor() {
    this.alerted = false;
    this.lastKnownPos = null;
    this.searchTimer = 0;
  }
  raiseAlert(pos) {
    this.alerted = true;
    this.lastKnownPos = { x: pos.x, y: pos.y };
    this.searchTimer = SEARCH_DURATION;
  }
  update(dt) {
    if (!this.alerted) return;
    this.searchTimer -= dt;
    if (this.searchTimer <= 0) {
      this.alerted = false;
      this.lastKnownPos = null;
      this.searchTimer = 0;
    }
  }
}

class Enemy {
  constructor(x, y, alertSystem = new AlertSystem()) {
    this.x = x;
    this.y = y;
    this.vision = new Vision(Math.PI / 2, ALERT_STAGES[0].visionRange);
    this.vision.x = x;
    this.vision.y = y;
    this.alertLevel = 0; // 0=unaware, 1=suspect, 2=search, 3=alert
    this.lastKnownPos = null;
    this.searchTimer = 0;
    this.alertSystem = alertSystem;
  }

  get stage() { return ALERT_STAGES[this.alertLevel].name; }
  get moveSpeed() { return ALERT_STAGES[this.alertLevel].moveSpeed; }
  get visionRange() { return ALERT_STAGES[this.alertLevel].visionRange; }

  // 公开用途不变：检测玩家是否在当前视野内
  detect(player, obstacles) {
    this.vision.range = ALERT_STAGES[this.alertLevel].visionRange;
    return this.vision.canSee(player, obstacles);
  }

  // 公开用途不变：拉响警报并共享最后已知位置
  alert(pos) {
    this.alertLevel = 3;
    this.lastKnownPos = { x: pos.x, y: pos.y };
    this.searchTimer = SEARCH_DURATION;
    this.alertSystem.raiseAlert(pos);
  }

  // 只设置目标朝向，实际朝向由 update 每帧平滑逼近
  turnTo(angle) {
    this.vision.facing = normalizeAngle(angle);
  }

  update(dt, player, obstacles) {
    this.vision.x = this.x;
    this.vision.y = this.y;
    this.vision.update(dt); // 转向过程中视野逐帧平滑跟随
    this.alertSystem.update(dt);

    if (player && this.detect(player, obstacles)) {
      this.alert(player);
      return;
    }

    if (this.alertLevel > 0) {
      // 共享警报：跟随队伍的最后已知位置，不各自为战
      if (this.alertSystem.alerted && this.alertSystem.lastKnownPos) {
        this.lastKnownPos = { ...this.alertSystem.lastKnownPos };
        if (this.alertLevel < 2) this.alertLevel = 2;
      }
      // 脱离视野后在最后已知位置搜寻一段时间，逐级解除
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) {
        this.alertLevel -= 1;
        this.searchTimer = SEARCH_DURATION;
        if (this.alertLevel <= 0) {
          this.alertLevel = 0;
          this.lastKnownPos = null;
        }
      }
    } else if (this.alertSystem.alerted && this.alertSystem.lastKnownPos) {
      // 其他敌人拉响警报，本敌人进入搜寻阶段
      this.lastKnownPos = { ...this.alertSystem.lastKnownPos };
      this.alertLevel = 2;
      this.searchTimer = SEARCH_DURATION;
    }
  }
}

module.exports = { Enemy, AlertSystem, ALERT_STAGES, SEARCH_DURATION };
