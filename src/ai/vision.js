
class Vision {
  constructor(angle, range) { this.angle=angle; this.range=range; this.facing=0; }
  canSee(target, obstacles) {
    const dx = target.x - this.x; const dy = target.y - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.range) return false;
    // BUG: 不检测障碍物遮挡
    const angleToTarget = Math.atan2(dy, dx);
    let diff = Math.abs(angleToTarget - this.facing);
    if (diff > Math.PI) diff = 2*Math.PI - diff;
    return diff < this.angle / 2;
  }
}

module.exports = { Vision };
