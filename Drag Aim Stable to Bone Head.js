// === Vector3 Class ===
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }

  add(v) {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v) {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiplyScalar(s) {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize() {
    const len = this.length();
    return len > 0 ? this.multiplyScalar(1 / len) : new Vector3();
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  lerp(v, t) {
    return new Vector3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  distanceTo(v) {
    return this.subtract(v).length();
  }

  setFrom(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  addInPlace(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  static zero() {
    return new Vector3(0, 0, 0);
  }
}

// === Enhanced Drag Aim System ===
class DragAimEnhanced {
  constructor(config = {}) {
    this.config = {
      dragSpeed: config.dragSpeed || 0.01,
      smoothingFactor: config.smoothingFactor || 0.8,
      headLockThreshold: config.headLockThreshold || 0.01,
      maxDragDistance: config.maxDragDistance || 999.0,
      velocityThreshold: config.velocityThreshold || 0.01,
      adaptiveSpeed: config.adaptiveSpeed !== false,
      ...config
    };

    this.lastDragVec = Vector3.zero();
    this.smoothedVelocity = Vector3.zero();
    this.dragDirection = null;
    this.lastY = null;
    this.headLocked = true;
    this.frameCount = 0;
    this.velocityHistory = [];
    this.maxHistoryLength = 50;
    this.tempVec = new Vector3();
    this.lastUpdateTime = Date.now();
  }

  calculateAdaptiveSpeed(currentAim, targetBone) {
    const distance = currentAim.distanceTo(targetBone);
    const normalizedDistance = Math.min(distance / this.config.maxDragDistance, 1.0);
    const distanceMultiplier = 0.3 + 0.7 * normalizedDistance;
    const avgVelocity = this.getAverageVelocity();
    const velocityMultiplier = Math.min(1.0 + avgVelocity * 2, 2.0);
    return this.config.dragSpeed * distanceMultiplier * velocityMultiplier;
  }

  getAverageVelocity() {
    if (this.velocityHistory.length === 0) return 0;
    const sum = this.velocityHistory.reduce((acc, v) => acc + v.length(), 0);
    return sum / this.velocityHistory.length;
  }

  updateVelocityHistory(velocity) {
    this.velocityHistory.push(velocity.clone());
    if (this.velocityHistory.length > this.maxHistoryLength) {
      this.velocityHistory.shift();
    }
  }

  shouldLockHead(currentAim, boneHead, boneChest) {
    const chestToHead = boneHead.subtract(boneChest);
    const currentToChest = currentAim.subtract(boneChest);
    const dotProduct = currentToChest.dot(chestToHead);
    const progress = dotProduct / chestToHead.lengthSquared();
    return progress >= 0.5 && progress <= 1.2;
  }

  predictTrajectory(currentAim, targetBone, steps = 3) {
    let predicted = currentAim.clone();
    const stepSize = this.config.dragSpeed / steps;
    for (let i = 0; i < steps; i++) {
      const currentDrag = targetBone.subtract(predicted);
      predicted = predicted.add(currentDrag.multiplyScalar(stepSize));
    }
    return predicted;
  }

  dragToHeadEnhanced(currentAim, boneHead, boneChest, deltaTime) {
    const currentTime = Date.now();
    const dt = deltaTime || (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    const dragVec = boneHead.subtract(currentAim);
    const dragY = dragVec.y;

    if (this.lastY !== null) {
      const yDiff = dragY - this.lastY;
      if (Math.abs(yDiff) > this.config.velocityThreshold) {
        this.dragDirection = yDiff > 0 ? "up" : "down";
      }
    }
    this.lastY = dragY;

    const velocity = this.lastDragVec.subtract(dragVec).multiplyScalar(1 / dt);
    this.updateVelocityHistory(velocity);

    if (this.dragDirection === "up" && this.shouldLockHead(currentAim, boneHead, boneChest)) {
      this.headLocked = true;
    }

    if (this.headLocked) {
      const headDistance = currentAim.distanceTo(boneHead);
      if (headDistance < this.config.headLockThreshold) {
        return boneHead.clone();
      }
      const lerpFactor = Math.min(this.config.dragSpeed * 3, 0.5);
      return currentAim.lerp(boneHead, lerpFactor);
    }

    const adaptiveSpeed = this.config.adaptiveSpeed ?
      this.calculateAdaptiveSpeed(currentAim, boneHead) :
      this.config.dragSpeed;

    this.smoothedVelocity = this.smoothedVelocity.multiplyScalar(this.config.smoothingFactor)
      .add(dragVec.multiplyScalar(1 - this.config.smoothingFactor));

    const result = currentAim.add(this.smoothedVelocity.multiplyScalar(adaptiveSpeed));
    this.lastDragVec = dragVec.clone();
    this.frameCount++;
    return result;
  }

  getDebugInfo() {
    return {
      dragDirection: this.dragDirection,
      headLocked: this.headLocked,
      frameCount: this.frameCount,
      avgVelocity: this.getAverageVelocity().toFixed(4),
      smoothedVelocity: {
        x: this.smoothedVelocity.x.toFixed(4),
        y: this.smoothedVelocity.y.toFixed(4),
        z: this.smoothedVelocity.z.toFixed(4)
      }
    };
  }

  reset(fullReset = true) {
    this.dragDirection = null;
    this.headLocked = false;
    this.lastY = null;
    if (fullReset) {
      this.velocityHistory = [];
      this.smoothedVelocity = Vector3.zero();
      this.frameCount = 0;
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// === Simulation ===
const dragSystem = new DragAimEnhanced({
  dragSpeed: 0.01,
  smoothingFactor: 0.85,
  adaptiveSpeed: true,
  headLockThreshold: 0.01
});

let currentCrosshair = new Vector3(0, 1.0, 0);
const boneChest = new Vector3(0, 1.2, 0);
const boneHead = new Vector3(0, 1.6, 0);
let frameCounter = 0;
let lastTime = Date.now();

function runEnhancedDragStep() {
  const currentTime = Date.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  const newAim = dragSystem.dragToHeadEnhanced(currentCrosshair, boneHead, boneChest, deltaTime);
  currentCrosshair = newAim;

  if (frameCounter % 30 === 0) {
    console.log("🎯 Enhanced Aim:", {
      position: {
        x: newAim.x.toFixed(3),
        y: newAim.y.toFixed(3),
        z: newAim.z.toFixed(3)
      },
      debug: dragSystem.getDebugInfo()
    });
  }

  frameCounter++;
  if (frameCounter < 300) {
    setTimeout(runEnhancedDragStep, 16);
  } else {
    console.log("🏁 Simulation completed");
  }
}

console.log("🚀 Starting Enhanced Drag Aim System...");
runEnhancedDragStep();

// === Utility ===
function createDragSystemWithPreset(preset) {
  const presets = {
    smooth: {
      dragSpeed: 0.01,
      smoothingFactor: 0.9,
      adaptiveSpeed: true,
      headLockThreshold: 0.03
    },
    responsive: {
      dragSpeed: 0.25,
      smoothingFactor: 0.7,
      adaptiveSpeed: true,
      headLockThreshold: 0.08
    },
    precise: {
      dragSpeed: 0.3,
      smoothingFactor: 0.95,
      adaptiveSpeed: false,
      headLockThreshold: 0.02
    }
  };
  return new DragAimEnhanced(presets[preset] || presets.smooth);
}

// Export if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vector3, DragAimEnhanced, createDragSystemWithPreset };
}
