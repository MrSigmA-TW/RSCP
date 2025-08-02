// 物理引擎 - 處理碰撞檢測、運動和物理模擬
export class PhysicsEngine {
    constructor() {
        this.gravity = 980; // 重力加速度 (像素/秒²)
        this.friction = 0.8; // 摩擦係數
        this.airResistance = 0.99; // 空氣阻力
        this.bounceThreshold = 50; // 彈跳閾值
        this.timeStep = 1/60; // 物理時間步長
        
        // 物理物件列表
        this.bodies = [];
        this.staticBodies = [];
        this.triggers = [];
        
        // 碰撞檢測優化
        this.spatialGrid = new SpatialGrid(100); // 100像素網格
        this.broadPhaseCollisions = [];
        this.narrowPhaseCollisions = [];
        
        // 物理世界邊界
        this.worldBounds = {
            left: 0,
            right: 800,
            top: 0,
            bottom: 600
        };
        
        // 性能統計
        this.stats = {
            bodiesCount: 0,
            collisionChecks: 0,
            collisionsDetected: 0,
            updateTime: 0
        };
    }

    async init() {
        console.log('⚡ 初始化物理引擎');
        this.spatialGrid.clear();
    }

    update(deltaTime) {
        const startTime = performance.now();
        
        // 重置統計
        this.stats.collisionChecks = 0;
        this.stats.collisionsDetected = 0;
        this.stats.bodiesCount = this.bodies.length;
        
        // 更新空間網格
        this.updateSpatialGrid();
        
        // 物理更新
        this.updateBodies(deltaTime);
        
        // 碰撞檢測
        this.detectCollisions();
        
        // 解決碰撞
        this.resolveCollisions();
        
        // 更新統計
        this.stats.updateTime = performance.now() - startTime;
    }

    updateSpatialGrid() {
        this.spatialGrid.clear();
        
        // 添加動態物體到空間網格
        this.bodies.forEach(body => {
            this.spatialGrid.addBody(body);
        });
        
        // 添加靜態物體到空間網格
        this.staticBodies.forEach(body => {
            this.spatialGrid.addBody(body);
        });
    }

    updateBodies(deltaTime) {
        this.bodies.forEach(body => {
            if (!body.isStatic) {
                this.updateBodyPhysics(body, deltaTime);
            }
        });
    }

    updateBodyPhysics(body, deltaTime) {
        // 應用重力
        if (body.useGravity) {
            body.velocity.y += this.gravity * deltaTime;
        }
        
        // 應用空氣阻力
        body.velocity.x *= this.airResistance;
        body.velocity.y *= this.airResistance;
        
        // 應用摩擦力（當物體在地面上時）
        if (body.onGround) {
            body.velocity.x *= this.friction;
        }
        
        // 更新位置
        body.x += body.velocity.x * deltaTime;
        body.y += body.velocity.y * deltaTime;
        
        // 檢查世界邊界
        this.checkWorldBounds(body);
        
        // 更新物體狀態
        body.onGround = false; // 每幀重置，碰撞檢測時會重新設置
    }

    checkWorldBounds(body) {
        // 左右邊界
        if (body.x < this.worldBounds.left) {
            body.x = this.worldBounds.left;
            body.velocity.x = Math.abs(body.velocity.x) * body.bounciness;
        } else if (body.x + body.width > this.worldBounds.right) {
            body.x = this.worldBounds.right - body.width;
            body.velocity.x = -Math.abs(body.velocity.x) * body.bounciness;
        }
        
        // 上下邊界
        if (body.y < this.worldBounds.top) {
            body.y = this.worldBounds.top;
            body.velocity.y = Math.abs(body.velocity.y) * body.bounciness;
        } else if (body.y + body.height > this.worldBounds.bottom) {
            body.y = this.worldBounds.bottom - body.height;
            body.velocity.y = -Math.abs(body.velocity.y) * body.bounciness;
            body.onGround = true;
        }
    }

    detectCollisions() {
        this.broadPhaseCollisions = [];
        this.narrowPhaseCollisions = [];
        
        // 廣相位碰撞檢測（使用空間網格）
        this.bodies.forEach(bodyA => {
            const nearbyBodies = this.spatialGrid.getNearbyBodies(bodyA);
            
            nearbyBodies.forEach(bodyB => {
                if (bodyA !== bodyB && this.broadPhaseCheck(bodyA, bodyB)) {
                    this.broadPhaseCollisions.push([bodyA, bodyB]);
                }
            });
        });
        
        // 窄相位碰撞檢測（精確檢測）
        this.broadPhaseCollisions.forEach(([bodyA, bodyB]) => {
            this.stats.collisionChecks++;
            
            const collision = this.narrowPhaseCheck(bodyA, bodyB);
            if (collision) {
                this.narrowPhaseCollisions.push(collision);
                this.stats.collisionsDetected++;
            }
        });
    }

    broadPhaseCheck(bodyA, bodyB) {
        // AABB 包圍盒檢測
        return !(bodyA.x + bodyA.width < bodyB.x ||
                bodyB.x + bodyB.width < bodyA.x ||
                bodyA.y + bodyA.height < bodyB.y ||
                bodyB.y + bodyB.height < bodyA.y);
    }

    narrowPhaseCheck(bodyA, bodyB) {
        // 根據物體形狀進行精確碰撞檢測
        if (bodyA.shape === 'rectangle' && bodyB.shape === 'rectangle') {
            return this.checkRectangleCollision(bodyA, bodyB);
        } else if (bodyA.shape === 'circle' && bodyB.shape === 'circle') {
            return this.checkCircleCollision(bodyA, bodyB);
        } else if ((bodyA.shape === 'rectangle' && bodyB.shape === 'circle') ||
                   (bodyA.shape === 'circle' && bodyB.shape === 'rectangle')) {
            return this.checkCircleRectangleCollision(bodyA, bodyB);
        }
        
        return null;
    }

    checkRectangleCollision(bodyA, bodyB) {
        const overlapX = Math.min(bodyA.x + bodyA.width, bodyB.x + bodyB.width) - 
                        Math.max(bodyA.x, bodyB.x);
        const overlapY = Math.min(bodyA.y + bodyA.height, bodyB.y + bodyB.height) - 
                        Math.max(bodyA.y, bodyB.y);
        
        if (overlapX > 0 && overlapY > 0) {
            // 確定碰撞方向
            let normal = { x: 0, y: 0 };
            
            if (overlapX < overlapY) {
                // 水平碰撞
                normal.x = bodyA.x < bodyB.x ? -1 : 1;
            } else {
                // 垂直碰撞
                normal.y = bodyA.y < bodyB.y ? -1 : 1;
            }
            
            return {
                bodyA: bodyA,
                bodyB: bodyB,
                normal: normal,
                penetration: Math.min(overlapX, overlapY),
                contactPoint: {
                    x: Math.max(bodyA.x, bodyB.x) + overlapX / 2,
                    y: Math.max(bodyA.y, bodyB.y) + overlapY / 2
                }
            };
        }
        
        return null;
    }

    checkCircleCollision(bodyA, bodyB) {
        const dx = (bodyA.x + bodyA.radius) - (bodyB.x + bodyB.radius);
        const dy = (bodyA.y + bodyA.radius) - (bodyB.y + bodyB.radius);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radiusSum = bodyA.radius + bodyB.radius;
        
        if (distance < radiusSum) {
            const penetration = radiusSum - distance;
            const normal = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
            
            return {
                bodyA: bodyA,
                bodyB: bodyB,
                normal: normal,
                penetration: penetration,
                contactPoint: {
                    x: bodyA.x + bodyA.radius - normal.x * bodyA.radius,
                    y: bodyA.y + bodyA.radius - normal.y * bodyA.radius
                }
            };
        }
        
        return null;
    }

    checkCircleRectangleCollision(bodyA, bodyB) {
        // 確定哪個是圓形，哪個是矩形
        const circle = bodyA.shape === 'circle' ? bodyA : bodyB;
        const rect = bodyA.shape === 'rectangle' ? bodyA : bodyB;
        
        // 找到矩形上最接近圓心的點
        const closestX = Math.max(rect.x, Math.min(circle.x + circle.radius, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y + circle.radius, rect.y + rect.height));
        
        // 計算距離
        const dx = (circle.x + circle.radius) - closestX;
        const dy = (circle.y + circle.radius) - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < circle.radius) {
            const penetration = circle.radius - distance;
            const normal = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
            
            // 如果圓形是 bodyB，需要反轉法向量
            if (circle === bodyB) {
                normal.x = -normal.x;
                normal.y = -normal.y;
            }
            
            return {
                bodyA: bodyA,
                bodyB: bodyB,
                normal: normal,
                penetration: penetration,
                contactPoint: { x: closestX, y: closestY }
            };
        }
        
        return null;
    }

    resolveCollisions() {
        this.narrowPhaseCollisions.forEach(collision => {
            this.resolveCollision(collision);
        });
    }

    resolveCollision(collision) {
        const { bodyA, bodyB, normal, penetration, contactPoint } = collision;
        
        // 分離物體
        this.separateBodies(bodyA, bodyB, normal, penetration);
        
        // 解決速度
        this.resolveVelocity(bodyA, bodyB, normal);
        
        // 觸發碰撞事件
        this.triggerCollisionEvents(bodyA, bodyB, contactPoint);
    }

    separateBodies(bodyA, bodyB, normal, penetration) {
        // 根據質量分配分離距離
        const totalMass = bodyA.mass + bodyB.mass;
        const separationA = bodyB.isStatic ? penetration : (bodyB.mass / totalMass) * penetration;
        const separationB = bodyA.isStatic ? penetration : (bodyA.mass / totalMass) * penetration;
        
        if (!bodyA.isStatic) {
            bodyA.x -= normal.x * separationA;
            bodyA.y -= normal.y * separationA;
        }
        
        if (!bodyB.isStatic) {
            bodyB.x += normal.x * separationB;
            bodyB.y += normal.y * separationB;
        }
    }

    resolveVelocity(bodyA, bodyB, normal) {
        // 計算相對速度
        const relativeVelocity = {
            x: bodyA.velocity.x - bodyB.velocity.x,
            y: bodyA.velocity.y - bodyB.velocity.y
        };
        
        // 計算相對速度在法向量上的投影
        const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
        
        // 如果物體正在分離，不需要解決
        if (velocityAlongNormal > 0) return;
        
        // 計算彈性係數
        const restitution = Math.min(bodyA.bounciness, bodyB.bounciness);
        
        // 計算衝量標量
        let impulseScalar = -(1 + restitution) * velocityAlongNormal;
        impulseScalar /= (1/bodyA.mass + 1/bodyB.mass);
        
        // 應用衝量
        const impulse = { x: impulseScalar * normal.x, y: impulseScalar * normal.y };
        
        if (!bodyA.isStatic) {
            bodyA.velocity.x += impulse.x / bodyA.mass;
            bodyA.velocity.y += impulse.y / bodyA.mass;
        }
        
        if (!bodyB.isStatic) {
            bodyB.velocity.x -= impulse.x / bodyB.mass;
            bodyB.velocity.y -= impulse.y / bodyB.mass;
        }
        
        // 設置地面狀態
        if (normal.y < -0.5) {
            bodyA.onGround = true;
        } else if (normal.y > 0.5) {
            bodyB.onGround = true;
        }
    }

    triggerCollisionEvents(bodyA, bodyB, contactPoint) {
        // 觸發碰撞回調
        if (bodyA.onCollision) {
            bodyA.onCollision(bodyB, contactPoint);
        }
        
        if (bodyB.onCollision) {
            bodyB.onCollision(bodyA, contactPoint);
        }
        
        // 觸發全域碰撞事件
        const event = new CustomEvent('physicsCollision', {
            detail: { bodyA, bodyB, contactPoint }
        });
        document.dispatchEvent(event);
    }

    // 物體管理
    addBody(body) {
        // 設置預設物理屬性
        const physicsBody = {
            x: body.x || 0,
            y: body.y || 0,
            width: body.width || 20,
            height: body.height || 20,
            radius: body.radius || 10,
            shape: body.shape || 'rectangle',
            
            velocity: body.velocity || { x: 0, y: 0 },
            acceleration: body.acceleration || { x: 0, y: 0 },
            
            mass: body.mass || 1,
            bounciness: body.bounciness || 0.3,
            friction: body.friction || 0.8,
            
            isStatic: body.isStatic || false,
            useGravity: body.useGravity !== false,
            isTrigger: body.isTrigger || false,
            
            onGround: false,
            onCollision: body.onCollision || null,
            
            // 引用原始物件
            gameObject: body
        };
        
        if (physicsBody.isStatic) {
            this.staticBodies.push(physicsBody);
        } else {
            this.bodies.push(physicsBody);
        }
        
        return physicsBody;
    }

    removeBody(body) {
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
            return true;
        }
        
        const staticIndex = this.staticBodies.indexOf(body);
        if (staticIndex !== -1) {
            this.staticBodies.splice(staticIndex, 1);
            return true;
        }
        
        return false;
    }

    // 力的應用
    applyForce(body, force) {
        if (!body.isStatic) {
            body.acceleration.x += force.x / body.mass;
            body.acceleration.y += force.y / body.mass;
        }
    }

    applyImpulse(body, impulse) {
        if (!body.isStatic) {
            body.velocity.x += impulse.x / body.mass;
            body.velocity.y += impulse.y / body.mass;
        }
    }

    // 射線檢測
    raycast(start, direction, maxDistance = Infinity) {
        const hits = [];
        
        // 正規化方向向量
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        const normalizedDir = { x: direction.x / length, y: direction.y / length };
        
        // 檢測所有物體
        [...this.bodies, ...this.staticBodies].forEach(body => {
            const hit = this.raycastBody(start, normalizedDir, maxDistance, body);
            if (hit) {
                hits.push(hit);
            }
        });
        
        // 按距離排序
        hits.sort((a, b) => a.distance - b.distance);
        
        return hits;
    }

    raycastBody(start, direction, maxDistance, body) {
        if (body.shape === 'rectangle') {
            return this.raycastRectangle(start, direction, maxDistance, body);
        } else if (body.shape === 'circle') {
            return this.raycastCircle(start, direction, maxDistance, body);
        }
        
        return null;
    }

    raycastRectangle(start, direction, maxDistance, rect) {
        // 射線與矩形的交點檢測
        const tMin = (rect.x - start.x) / direction.x;
        const tMax = (rect.x + rect.width - start.x) / direction.x;
        const tyMin = (rect.y - start.y) / direction.y;
        const tyMax = (rect.y + rect.height - start.y) / direction.y;
        
        const tNear = Math.max(Math.min(tMin, tMax), Math.min(tyMin, tyMax));
        const tFar = Math.min(Math.max(tMin, tMax), Math.max(tyMin, tyMax));
        
        if (tNear <= tFar && tNear >= 0 && tNear <= maxDistance) {
            const hitPoint = {
                x: start.x + direction.x * tNear,
                y: start.y + direction.y * tNear
            };
            
            return {
                body: rect,
                point: hitPoint,
                distance: tNear,
                normal: this.calculateRectangleNormal(hitPoint, rect)
            };
        }
        
        return null;
    }

    raycastCircle(start, direction, maxDistance, circle) {
        const centerX = circle.x + circle.radius;
        const centerY = circle.y + circle.radius;
        
        const dx = start.x - centerX;
        const dy = start.y - centerY;
        
        const a = direction.x * direction.x + direction.y * direction.y;
        const b = 2 * (dx * direction.x + dy * direction.y);
        const c = dx * dx + dy * dy - circle.radius * circle.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant >= 0) {
            const t = (-b - Math.sqrt(discriminant)) / (2 * a);
            
            if (t >= 0 && t <= maxDistance) {
                const hitPoint = {
                    x: start.x + direction.x * t,
                    y: start.y + direction.y * t
                };
                
                const normal = {
                    x: (hitPoint.x - centerX) / circle.radius,
                    y: (hitPoint.y - centerY) / circle.radius
                };
                
                return {
                    body: circle,
                    point: hitPoint,
                    distance: t,
                    normal: normal
                };
            }
        }
        
        return null;
    }

    calculateRectangleNormal(point, rect) {
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        
        if (absX > absY) {
            return { x: dx > 0 ? 1 : -1, y: 0 };
        } else {
            return { x: 0, y: dy > 0 ? 1 : -1 };
        }
    }

    // 設置世界邊界
    setWorldBounds(bounds) {
        this.worldBounds = { ...bounds };
    }

    // 獲取統計信息
    getStats() {
        return { ...this.stats };
    }

    // 清理
    clear() {
        this.bodies = [];
        this.staticBodies = [];
        this.triggers = [];
        this.spatialGrid.clear();
    }
}

// 空間網格類別 - 用於優化碰撞檢測
class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    getKey(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return `${gridX},${gridY}`;
    }

    addBody(body) {
        // 計算物體佔據的網格範圍
        const minX = Math.floor(body.x / this.cellSize);
        const maxX = Math.floor((body.x + (body.width || body.radius * 2)) / this.cellSize);
        const minY = Math.floor(body.y / this.cellSize);
        const maxY = Math.floor((body.y + (body.height || body.radius * 2)) / this.cellSize);
        
        // 將物體添加到所有相關網格
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(body);
            }
        }
    }

    getNearbyBodies(body) {
        const nearby = new Set();
        
        // 獲取物體所在的網格
        const minX = Math.floor(body.x / this.cellSize);
        const maxX = Math.floor((body.x + (body.width || body.radius * 2)) / this.cellSize);
        const minY = Math.floor(body.y / this.cellSize);
        const maxY = Math.floor((body.y + (body.height || body.radius * 2)) / this.cellSize);
        
        // 收集附近的物體
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                const bodies = this.grid.get(key);
                if (bodies) {
                    bodies.forEach(b => nearby.add(b));
                }
            }
        }
        
        // 移除自己
        nearby.delete(body);
        
        return Array.from(nearby);
    }
}