function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const minX = rect.x, maxX = rect.x + rect.w;
  const minY = rect.y, maxY = rect.y + rect.h;
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-12) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx, t2 = (maxX - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-12) {
    if (y1 < minY || y1 > maxY) return false;
  } else {
    let t1 = (minY - y1) / dy, t2 = (maxY - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

class Vision {
  constructor(angle, range) {
    this.angle = angle;            // 完整锥角（弧度）
    this.range = range;
    this.facing = 0;               // 目标朝向
    this.currentFacing = 0;        // 实际朝向（平滑跟随 facing）
    this.turnSpeed = Math.PI * 4;  // 转向速度 rad/s，保证每帧跟随、不滞后
    this.x = 0;
    this.y = 0;
  }

  // 每帧将实际朝向向目标朝向旋转，沿最短弧，到位即吸附，不跳变
  update(dt) {
    const diff = normalizeAngle(this.facing - this.currentFacing);
    const maxStep = this.turnSpeed * dt;
    if (Math.abs(diff) <= maxStep) {
      this.currentFacing = this.facing;
    } else {
      this.currentFacing = normalizeAngle(this.currentFacing + Math.sign(diff) * maxStep);
    }
  }

  getLeftBoundary() {
    return normalizeAngle(this.currentFacing - this.angle / 2);
  }

  getRightBoundary() {
    return normalizeAngle(this.currentFacing + this.angle / 2);
  }

  isAngleInCone(angle) {
    return Math.abs(normalizeAngle(angle - this.currentFacing)) <= this.angle / 2 + 1e-9;
  }

  isOccluded(target, obstacles) {
    for (const o of obstacles || []) {
      if (segmentIntersectsRect(this.x, this.y, target.x, target.y, o)) return true;
    }
    return false;
  }

  canSee(target, obstacles = []) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let range = this.range;
    if (target && typeof target.getDetectionModifier === 'function') {
      range *= target.getDetectionModifier();
    }
    if (dist > range) return false;
    if (!this.isAngleInCone(Math.atan2(dy, dx))) return false;
    if (this.isOccluded(target, obstacles)) return false;
    return true;
  }
}

module.exports = { Vision, normalizeAngle, segmentIntersectsRect };
