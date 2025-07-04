class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  normalize() { const len = this.length(); return len > 0 ? this.multiplyScalar(1 / len) : new Vector3(); }
  clone() { return new Vector3(this.x, this.y, this.z); }
}

// === Stable Drag Aim System ===
class DragAimStable {
  constructor() {
    this.lastDragVec = Vector3.zero();
    this.dragDirection = null; // "up" | "down" | null
    this.lastY = null;
    this.headLocked = false;
  }

  shouldLockHead(currentAim, boneHead, boneChest) {
    // Nếu tâm đã ở trên ngực và đang drag lên
    return currentAim.y >= boneChest.y && currentAim.y <= boneHead.y;
  }

  dragToHeadStable(currentAim, boneHead, boneChest) {
    const dragVec = boneHead.subtract(currentAim);
    const dragY = dragVec.y;

    // Xác định hướng drag
    if (this.lastY !== null) {
      this.dragDirection = dragY > this.lastY ? "up" : "down";
    }
    this.lastY = dragY;

    // Nếu đang drag lên và vượt qua chest, thì giữ hướng lên
    if (this.dragDirection === "up" && this.shouldLockHead(currentAim, boneHead, boneChest)) {
      this.headLocked = true;
    }

    if (this.headLocked) {
      // Đã vượt qua ngực, khóa luôn vào đầu (không lùi về dưới)
      return boneHead.clone();
    }

    // Nếu chưa đạt điều kiện thì vẫn drag thường
    return currentAim.add(dragVec.multiplyScalar(0.15)); // drag nhẹ
  }

  reset() {
    this.dragDirection = null;
    this.headLocked = false;
    this.lastY = null;
  }
}

// === Example Simulation ===
const dragSystem = new DragAimStable();

// Ví dụ vị trí:
const currentCrosshair = new Vector3(0, 1.0, 0); // đang ở vùng thân
const boneChest = new Vector3(0, 1.2, 0);
const boneHead = new Vector3(0, 1.6, 0);

// Gọi mỗi frame
function runDragStep() {
  const newAim = dragSystem.dragToHeadStable(currentCrosshair, boneHead, boneChest);
  console.log("🎯 Aim Position:", newAim.x.toFixed(3), newAim.y.toFixed(3), newAim.z.toFixed(3));
  setTimeout(runDragStep, 16);
}

runDragStep();
