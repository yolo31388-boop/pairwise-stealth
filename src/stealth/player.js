
class Player {
  constructor(x, y) { this.x=x; this.y=y; this.crouching=false; this.inShadow=false; }
  getDetectionModifier() {
    // BUG: 蹲伏完全隐形
    if (this.crouching) return 0;
    return 1;
  }
}

module.exports = { Player };
