const canvas = document.getElementById('sunflowerCanvas');
        const ctx = canvas.getContext('2d', { alpha: false });

        const bgCanvas = document.createElement('canvas');
        const bgCtx = bgCanvas.getContext('2d', { alpha: false });
        const sprites = {};

        let width = window.innerWidth;
        let height = window.innerHeight;
        let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        let sunflowers = [];
        let goldenMotes = [];
        let fallingPetals = [];
        let globalTime = 0;
        let lastTimestamp = 0;
        let pointerX = width * 0.5;
        let pointerY = height * 0.35;
        let breeze = 0;
        let breezeVel = 0;
 
        // MATH & EASING UTILITIES 
        function randomRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        function clamp(val, min, max) {
            return Math.min(Math.max(val, min), max);
        }

        function lerp(a, b, t) {
            return a + (b - a) * t;
        }

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function easeOutQuint(t) {
            return 1 - Math.pow(1 - t, 5);
        }
 
        // SUNFLOWER CULTIVAR PALETTES (GOLDEN AUTUMN & HONEY AMBER) 
        const SUNFLOWER_PALETTES = [
            {
                name: 'Classic Golden Giant',
                petalBase: '#b45309',
                petalMid: '#f59e0b',
                petalTip: '#fde047',
                rim: 'rgba(254, 249, 195, 0.82)',
                discOuter: '#451a03',
                discInner: '#1c0a00',
                floretGold: '#fbbf24'
            },
            {
                name: 'Honey Amber Sun',
                petalBase: '#9a3412',
                petalMid: '#ea580c',
                petalTip: '#facc15',
                rim: 'rgba(254, 240, 138, 0.78)',
                discOuter: '#3b0f04',
                discInner: '#170602',
                floretGold: '#f59e0b'
            },
            {
                name: 'Lemon Radiance',
                petalBase: '#ca8a04',
                petalMid: '#eab308',
                petalTip: '#fef08a',
                rim: 'rgba(255, 251, 235, 0.86)',
                discOuter: '#422006',
                discInner: '#1a0c02',
                floretGold: '#fde047'
            }
        ];
 
        // OFFSCREEN GLOW SPRITES & GOLDEN HOUR MEADOW BACKDROP CACHE 
        function createRadialSprite(size, stops) {
            const off = document.createElement('canvas');
            off.width = size;
            off.height = size;
            const octx = off.getContext('2d');
            const half = size * 0.5;
            const grad = octx.createRadialGradient(half, half, 0, half, half, half);
            stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
            octx.fillStyle = grad;
            octx.fillRect(0, 0, size, size);
            return off;
        }

        function initSprites() {
            sprites.sunAura = createRadialSprite(260, [
                [0.0, 'rgba(250, 204, 21, 0.34)'],
                [0.45, 'rgba(217, 119, 6, 0.14)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
            sprites.pollenMote = createRadialSprite(44, [
                [0.0, 'rgba(254, 249, 195, 0.96)'],
                [0.35, 'rgba(251, 191, 36, 0.48)'],
                [0.75, 'rgba(217, 119, 6, 0.12)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
        }

        function rebuildMeadowBackdrop() {
            const safeW = Math.max(1, Math.floor(width * dpr));
            const safeH = Math.max(1, Math.floor(height * dpr));
            bgCanvas.width = safeW;
            bgCanvas.height = safeH;
            bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Warm dusk golden-hour sky gradient
            const skyGrad = bgCtx.createRadialGradient(
                width * 0.52, height * 0.24, 25,
                width * 0.5, height * 0.48, Math.max(width, height) * 0.88
            );
            skyGrad.addColorStop(0.0, '#2e1f09');
            skyGrad.addColorStop(0.42, '#171209');
            skyGrad.addColorStop(1.0, '#070604');
            bgCtx.fillStyle = skyGrad;
            bgCtx.fillRect(0, 0, width, height);

            // Warm sunbeam shafts & golden bokeh
            bgCtx.save();
            bgCtx.globalCompositeOperation = 'screen';
            const sunBeam = bgCtx.createRadialGradient(
                width * 0.52, height * 0.18, 10,
                width * 0.52, height * 0.18, Math.max(width, height) * 0.55
            );
            sunBeam.addColorStop(0.0, 'rgba(253, 224, 71, 0.14)');
            sunBeam.addColorStop(0.5, 'rgba(245, 158, 11, 0.05)');
            sunBeam.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
            bgCtx.fillStyle = sunBeam;
            bgCtx.fillRect(0, 0, width, height);

            for (let i = 0; i < 20; i++) {
                const bx = ((i * 181 + 31) % 100) / 100 * width;
                const by = ((i * 137 + 19) % 100) / 100 * height * 0.72;
                const br = 24 + (i % 5) * 20;
                const g = bgCtx.createRadialGradient(bx, by, 0, bx, by, br);
                g.addColorStop(0, i % 2 === 0 ? 'rgba(250, 204, 21, 0.06)' : 'rgba(234, 88, 12, 0.05)');
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                bgCtx.fillStyle = g;
                bgCtx.beginPath();
                bgCtx.arc(bx, by, br, 0, Math.PI * 2);
                bgCtx.fill();
            }
            bgCtx.restore();

            // Dark meadow earth horizon at bottom
            const soilTop = height * 0.83;
            const soilGrad = bgCtx.createLinearGradient(0, soilTop, 0, height);
            soilGrad.addColorStop(0.0, 'rgba(18, 22, 11, 0)');
            soilGrad.addColorStop(0.38, 'rgba(14, 18, 9, 0.90)');
            soilGrad.addColorStop(1.0, '#050603');
            bgCtx.fillStyle = soilGrad;
            bgCtx.fillRect(0, soilTop, width, height - soilTop);
        }
 
        // FLOATING GOLDEN POLLEN MOTES & DRIFTING PETALS 
        function initAtmosphere() {
            const count = clamp(Math.floor((width * height) / 36000), 16, 32);
            goldenMotes = [];
            for (let i = 0; i < count; i++) {
                goldenMotes.push({
                    x: randomRange(0, width),
                    y: randomRange(0, height * 0.85),
                    vx: randomRange(-9, 9),
                    vy: randomRange(-12, -3),
                    size: randomRange(7, 14),
                    phase: randomRange(0, Math.PI * 2),
                    speed: randomRange(1.4, 2.6)
                });
            }
            fallingPetals = [];
        }

        function spawnPetalDrift(x, y, palette) {
            for (let i = 0; i < 10; i++) {
                const ang = randomRange(0, Math.PI * 2);
                const spd = randomRange(24, 78);
                fallingPetals.push({
                    x,
                    y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 16,
                    rot: randomRange(0, Math.PI * 2),
                    vRot: randomRange(-2.6, 2.6),
                    len: randomRange(9, 14),
                    wid: randomRange(3.2, 4.8),
                    color: palette.petalMid,
                    life: 1.0
                });
            }
        }

        function updateAndDrawAtmosphere(context, dt) {
            context.save();
            context.globalCompositeOperation = 'screen';
            for (let i = 0; i < goldenMotes.length; i++) {
                const m = goldenMotes[i];
                m.x += (m.vx + breeze * 28) * dt + Math.sin(globalTime * 1.4 + m.phase) * 0.35;
                m.y += m.vy * dt;
                if (m.y < -20) {
                    m.y = height * 0.85;
                    m.x = randomRange(0, width);
                }
                if (m.x < -20) m.x = width + 20;
                if (m.x > width + 20) m.x = -20;

                const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(globalTime * m.speed + m.phase));
                context.globalAlpha = alpha;
                context.drawImage(sprites.pollenMote, m.x - m.size, m.y - m.size, m.size * 2, m.size * 2);
            }
            context.restore();

            for (let i = fallingPetals.length - 1; i >= 0; i--) {
                const p = fallingPetals[i];
                p.x += (p.vx + breeze * 34) * dt + Math.sin(globalTime * 3 + i) * 0.4;
                p.y += p.vy * dt;
                p.vy += 22 * dt;
                p.rot += p.vRot * dt;
                p.life -= dt * 0.55;

                if (p.life <= 0) {
                    fallingPetals.splice(i, 1);
                    continue;
                }

                context.save();
                context.translate(p.x, p.y);
                context.rotate(p.rot);
                context.globalAlpha = clamp(p.life, 0, 1);
                context.fillStyle = p.color;
                context.beginPath();
                context.ellipse(0, 0, p.len, p.wid, 0, 0, Math.PI * 2);
                context.fill();
                context.restore();
            }
        }
 
        // SUNFLOWER — FIBONACCI SEED SPIRAL, GOLDEN RAY FLORETS & HEART LEAVES 
        class Sunflower {
            constructor(opts) {
                this.baseX = opts.baseX;
                this.baseY = opts.baseY;
                this.stemHeight = opts.stemHeight || 330;
                this.lean = opts.lean || 0;
                this.radius = opts.radius || 76;
                this.palette = opts.palette || SUNFLOWER_PALETTES[0];
                this.delay = opts.delay || 0;
                this.age = -this.delay;
                this.bloomDuration = 2.2;
                this.swayPhase = randomRange(0, Math.PI * 2);
                this.curveAmp = opts.curveAmp || randomRange(8, 14);
                this.headTilt = opts.headTilt !== undefined ? opts.headTilt : this.lean * 0.45;
                this.leaves = opts.leaves || [
                    { t: 0.34, dir: -1, scale: 1.12 },
                    { t: 0.56, dir: 1, scale: 1.04 },
                    { t: 0.76, dir: -1, scale: 0.86 }
                ];

                // Precompute Fibonacci golden-angle seed coordinates for 60 FPS rendering
                this.seeds = [];
                const seedCount = 155;
                const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.508 deg
                for (let i = 0; i < seedCount; i++) {
                    const rNorm = Math.sqrt((i + 0.5) / seedCount);
                    const theta = i * goldenAngle;
                    this.seeds.push({
                        rx: Math.cos(theta) * rNorm,
                        ry: Math.sin(theta) * rNorm,
                        rNorm
                    });
                }
            }

            update(dt) {
                this.age += dt;
            }

            evalStemPoint(t, swayOffset) {
                const sCurve = Math.sin(t * Math.PI * 1.1) * this.curveAmp * Math.sign(this.lean || 1);
                const bend = this.lean * Math.pow(t, 1.3) * this.stemHeight * 0.54 + sCurve + swayOffset * Math.pow(t, 1.6);
                return {
                    x: this.baseX + bend,
                    y: this.baseY - t * this.stemHeight
                };
            }

            drawBroadSunflowerLeaf(context, x, y, dir, scale) {
                context.save();
                context.translate(x, y);
                context.scale(dir * scale, scale);

                // Sturdy petiole stalk
                context.strokeStyle = '#3f6212';
                context.lineWidth = 3.2;
                context.lineCap = 'round';
                context.beginPath();
                context.moveTo(0, 0);
                context.quadraticCurveTo(18, -6, 36, 4);
                context.stroke();

                // Large heart-ovate serrated sunflower leaf
                context.save();
                context.translate(32, 3);
                context.rotate(0.18);

                const len = 62;
                const wid = 34;
                const teeth = 10;

                context.beginPath();
                context.moveTo(0, 0);
                // Heart-shaped basal lobe (upper)
                context.bezierCurveTo(-8, -wid * 0.65, 8, -wid * 1.15, 20, -wid * 0.88);
                for (let i = 1; i <= teeth; i++) {
                    const t = i / (teeth + 1);
                    const bx = lerp(20, len, t);
                    const by = -wid * 0.88 * Math.pow(1 - t, 0.82);
                    context.lineTo(bx + 1.8, by - 2.4 * (1 - t * 0.5));
                    context.lineTo(bx + 3.6, by + 0.5);
                }
                context.lineTo(len + 6, 0);

                for (let i = teeth; i >= 1; i--) {
                    const t = i / (teeth + 1);
                    const bx = lerp(20, len, t);
                    const by = wid * 0.88 * Math.pow(1 - t, 0.82);
                    context.lineTo(bx + 1.8, by + 2.4 * (1 - t * 0.5));
                    context.lineTo(bx - 1.5, by - 0.5);
                }
                // Heart-shaped basal lobe (lower)
                context.bezierCurveTo(8, wid * 1.15, -8, wid * 0.65, 0, 0);
                context.closePath();

                const leafGrad = context.createLinearGradient(0, -wid, len, wid);
                leafGrad.addColorStop(0.0, '#1a330e');
                leafGrad.addColorStop(0.5, '#365314');
                leafGrad.addColorStop(1.0, '#4d7c0f');
                context.fillStyle = leafGrad;
                context.fill();

                context.strokeStyle = 'rgba(163, 230, 53, 0.42)';
                context.lineWidth = 1.1;
                context.stroke();

                // Prominent midrib and palmate side veins
                context.beginPath();
                context.moveTo(2, 0);
                context.lineTo(len, 0);
                for (let v = 0; v < 4; v++) {
                    const vx = 12 + v * 11;
                    const vw = wid * (0.72 - v * 0.14);
                    context.moveTo(vx, 0);
                    context.quadraticCurveTo(vx + 6, -vw * 0.5, vx + 12, -vw);
                    context.moveTo(vx, 0);
                    context.quadraticCurveTo(vx + 6, vw * 0.5, vx + 12, vw);
                }
                context.strokeStyle = 'rgba(190, 242, 100, 0.34)';
                context.lineWidth = 0.95;
                context.stroke();

                context.restore();
                context.restore();
            }

            drawSunflowerHead(context, cx, cy, openAmount, tiltAngle) {
                if (openAmount <= 0.01) return;

                const R = this.radius * lerp(0.24, 1.0, easeOutCubic(openAmount));
                const pulse = 1 + Math.sin(globalTime * 1.8 + this.swayPhase) * 0.012 * openAmount;
                const finalR = R * pulse;

                // Subtle heliotropic tracking toward pointer
                const lookX = clamp((pointerX - cx) / Math.max(width, 1), -0.35, 0.35) * 0.14;
                const lookY = clamp((pointerY - cy) / Math.max(height, 1), -0.35, 0.35) * 0.12;

                // Warm golden aura halo
                const glowR = finalR * 2.2;
                context.save();
                context.globalCompositeOperation = 'screen';
                context.globalAlpha = clamp(openAmount * 0.85, 0, 1);
                context.drawImage(sprites.sunAura, cx - glowR, cy - glowR, glowR * 2, glowR * 2);
                context.restore();

                context.save();
                context.translate(cx, cy);
                context.rotate(tiltAngle + lookX * 0.45);

                // 1. Pointed green involucral phyllaries (bract ring behind petals)
                const bractCount = 18;
                for (let b = 0; b < bractCount; b++) {
                    const ang = (b / bractCount) * Math.PI * 2;
                    const bLen = finalR * 0.72 * lerp(0.65, 1.0, openAmount);
                    const bWid = finalR * 0.13;
                    context.save();
                    context.rotate(ang);
                    context.beginPath();
                    context.moveTo(finalR * 0.34, -bWid);
                    context.quadraticCurveTo(finalR * 0.56, -bWid * 0.85, bLen, 0);
                    context.quadraticCurveTo(finalR * 0.56, bWid * 0.85, finalR * 0.34, bWid);
                    context.closePath();
                    context.fillStyle = b % 2 === 0 ? '#365314' : '#4d7c0f';
                    context.fill();
                    context.restore();
                }

                // 2. Two overlapping rings of golden lance-shaped ray florets
                const petalTiers = [
                    { count: 24, lenMult: 1.04, widMult: 0.17, rotOff: 0.0,  shade: 0.90 },
                    { count: 24, lenMult: 0.94, widMult: 0.16, rotOff: 0.13, shade: 1.00 }
                ];

                petalTiers.forEach((tier) => {
                    const pLen = finalR * tier.lenMult * lerp(0.42, 1.0, openAmount);
                    const pWid = finalR * tier.widMult;

                    for (let i = 0; i < tier.count; i++) {
                        const ang = (i / tier.count) * Math.PI * 2 + tier.rotOff;
                        const wave = Math.sin(ang * 5 + globalTime * 1.5 + this.swayPhase) * 0.03 * openAmount;

                        context.save();
                        context.rotate(ang + wave);

                        const traceRay = () => {
                            context.beginPath();
                            context.moveTo(finalR * 0.36, -pWid * 0.45);
                            context.bezierCurveTo(
                                finalR * 0.58, -pWid * 1.05,
                                pLen * 0.82, -pWid * 0.72,
                                pLen, 0
                            );
                            context.bezierCurveTo(
                                pLen * 0.82, pWid * 0.72,
                                finalR * 0.58, pWid * 1.05,
                                finalR * 0.36, pWid * 0.45
                            );
                            context.closePath();
                        };

                        // Soft occlusion shadow
                        context.save();
                        context.translate(0, 2.2);
                        traceRay();
                        context.fillStyle = 'rgba(28, 12, 0, 0.38)';
                        context.fill();
                        context.restore();

                        // Rich amber-to-lemon golden gradient
                        traceRay();
                        const pGrad = context.createLinearGradient(finalR * 0.36, 0, pLen, 0);
                        pGrad.addColorStop(0.00, this.palette.petalBase);
                        pGrad.addColorStop(0.45, this.palette.petalMid);
                        pGrad.addColorStop(0.88, this.palette.petalTip);
                        pGrad.addColorStop(1.00, '#fef9c3');
                        context.fillStyle = pGrad;
                        context.fill();

                        // Crisp golden edge highlight
                        context.strokeStyle = this.palette.rim;
                        context.lineWidth = 0.8;
                        context.stroke();

                        // Dual longitudinal petal pleats
                        context.beginPath();
                        context.moveTo(finalR * 0.42, -pWid * 0.24);
                        context.lineTo(pLen * 0.82, -pWid * 0.12);
                        context.moveTo(finalR * 0.42, pWid * 0.24);
                        context.lineTo(pLen * 0.82, pWid * 0.12);
                        context.strokeStyle = 'rgba(146, 64, 14, 0.28)';
                        context.lineWidth = 0.7;
                        context.stroke();

                        context.restore();
                    }
                });

                // 3. Dark Velvety Seed Disc Head (Capitulum)
                const discR = finalR * 0.48;
                const shiftX = lookX * discR * 0.45;
                const shiftY = lookY * discR * 0.45;

                const discGrad = context.createRadialGradient(
                    shiftX - discR * 0.18, shiftY - discR * 0.18, discR * 0.08,
                    shiftX, shiftY, discR
                );
                discGrad.addColorStop(0.0, this.palette.discInner);
                discGrad.addColorStop(0.68, this.palette.discOuter);
                discGrad.addColorStop(0.92, '#78350f');
                discGrad.addColorStop(1.0, '#b45309');

                context.beginPath();
                context.arc(shiftX, shiftY, discR, 0, Math.PI * 2);
                context.fillStyle = discGrad;
                context.fill();

                // 4. Fibonacci Phyllotaxis Seed & Golden Floret Spiral
                const seedScale = discR * 0.90;
                for (let s = 0; s < this.seeds.length; s++) {
                    const sd = this.seeds[s];
                    const sx = shiftX + sd.rx * seedScale;
                    const sy = shiftY + sd.ry * seedScale;
                    const dotR = Math.max(1.0, (discR / 44) * lerp(1.1, 1.85, sd.rNorm));

                    context.beginPath();
                    context.arc(sx, sy, dotR, 0, Math.PI * 2);
                    if (sd.rNorm > 0.74) {
                        // Outer ring of blooming golden-amber disc florets
                        context.fillStyle = this.palette.floretGold;
                    } else if (sd.rNorm > 0.48) {
                        context.fillStyle = '#92400e';
                    } else {
                        context.fillStyle = '#291002';
                    }
                    context.fill();
                }

                // Subtle rim ring framing the seed disc
                context.beginPath();
                context.arc(shiftX, shiftY, discR, 0, Math.PI * 2);
                context.strokeStyle = 'rgba(251, 191, 36, 0.45)';
                context.lineWidth = 1.2;
                context.stroke();

                context.restore();
            }

            drawPlant(context) {
                if (this.age < 0) return;

                const growT = easeOutCubic(clamp(this.age / 0.85, 0, 1));
                const sway = Math.sin(globalTime * 1.45 + this.swayPhase) * 6 + breeze * 24;
                const tip = this.evalStemPoint(growT, sway);
                const ctrl = this.evalStemPoint(growT * 0.5, sway * 0.45);

                context.save();
                context.lineCap = 'round';

                // Thick, sturdy green sunflower stalk
                context.beginPath();
                context.moveTo(this.baseX, this.baseY);
                context.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
                context.strokeStyle = '#264212';
                context.lineWidth = 6.2;
                context.stroke();

                context.beginPath();
                context.moveTo(this.baseX - 1.3, this.baseY);
                context.quadraticCurveTo(ctrl.x - 1.3, ctrl.y, tip.x - 1.3, tip.y);
                context.strokeStyle = '#65a30d';
                context.lineWidth = 2.0;
                context.stroke();

                // Broad heart-shaped serrated leaves
                this.leaves.forEach((lf) => {
                    if (growT > lf.t) {
                        const lPos = this.evalStemPoint(lf.t * growT, sway * lf.t);
                        const lScale = lf.scale * easeOutCubic(clamp((growT - lf.t) / 0.35, 0, 1));
                        this.drawBroadSunflowerLeaf(context, lPos.x, lPos.y, lf.dir, lScale);
                    }
                });

                context.restore();

                // Radiant golden sunflower head at tip
                const bloomOpen = easeOutQuint(clamp((this.age - 0.12) / this.bloomDuration, 0, 1));
                const dynamicTilt = this.headTilt + sway * 0.004;
                this.drawSunflowerHead(context, tip.x, tip.y, bloomOpen, dynamicTilt);
            }
        }
 
        // SCENE SEEDING & INTERACTION (FOCUSED SUNFLOWER CLUSTER) 
        function seedSunflowerMeadow() {
            sunflowers = [];
            const minDim = Math.min(width, height);
            const scale = clamp(minDim / 680, 0.68, 1.24);
            const cx = width * 0.5;
            const groundY = height * 0.90;

            const layout = [
                {
                    dx: -18 * scale, h: 425 * scale, lean: -0.07, r: 84 * scale, pal: 0, delay: 0.04, tilt: -0.08,
                    leaves: [
                        { t: 0.30, dir: -1, scale: 1.15 },
                        { t: 0.54, dir: 1, scale: 1.05 },
                        { t: 0.74, dir: -1, scale: 0.85 }
                    ]
                },
                {
                    dx: 34 * scale, h: 330 * scale, lean: 0.25, r: 78 * scale, pal: 1, delay: 0.18, tilt: 0.22,
                    leaves: [
                        { t: 0.38, dir: 1, scale: 1.12 },
                        { t: 0.66, dir: -1, scale: 0.92 }
                    ]
                },
                {
                    dx: -42 * scale, h: 270 * scale, lean: -0.26, r: 74 * scale, pal: 2, delay: 0.28, tilt: -0.20,
                    leaves: [
                        { t: 0.40, dir: -1, scale: 1.14 },
                        { t: 0.68, dir: 1, scale: 0.90 }
                    ]
                },
                {
                    dx: 12 * scale, h: 195 * scale, lean: 0.14, r: 66 * scale, pal: 0, delay: 0.38, tilt: 0.12,
                    leaves: [
                        { t: 0.45, dir: 1, scale: 1.02 }
                    ]
                }
            ];

            layout.forEach((item) => {
                sunflowers.push(
                    new Sunflower({
                        baseX: cx + item.dx,
                        baseY: groundY,
                        stemHeight: item.h,
                        lean: item.lean,
                        radius: item.r,
                        palette: SUNFLOWER_PALETTES[item.pal],
                        delay: item.delay,
                        headTilt: item.tilt,
                        leaves: item.leaves
                    })
                );
            });
        }

        function spawnSunflowerAt(x, y) {
            if (sunflowers.length >= 10) {
                sunflowers.shift();
            }
            const minDim = Math.min(width, height);
            const scale = clamp(minDim / 680, 0.68, 1.22);
            const groundY = height * 0.90;
            const targetH = clamp(groundY - y, 135 * scale, height * 0.74);
            const palette = SUNFLOWER_PALETTES[Math.floor(Math.random() * SUNFLOWER_PALETTES.length)];
            const lean = randomRange(-0.26, 0.26);

            sunflowers.push(
                new Sunflower({
                    baseX: x - lean * targetH * 0.45,
                    baseY: groundY,
                    stemHeight: targetH,
                    lean,
                    radius: randomRange(68, 86) * scale,
                    palette,
                    delay: 0,
                    headTilt: lean * 0.85
                })
            );
            spawnPetalDrift(x, y, palette);
        }

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            rebuildMeadowBackdrop();
            initAtmosphere();
            seedSunflowerMeadow();
        }

        function animate(timestamp) {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;
            globalTime += dt;

            const springForce = -13.0 * breeze - 4.0 * breezeVel;
            breezeVel += springForce * dt;
            breeze += breezeVel * dt;

            if (bgCanvas.width > 0 && bgCanvas.height > 0) {
                ctx.drawImage(bgCanvas, 0, 0, width, height);
            }

            for (let i = 0; i < sunflowers.length; i++) {
                sunflowers[i].update(dt);
                sunflowers[i].drawPlant(ctx);
            }

            updateAndDrawAtmosphere(ctx, dt);

            requestAnimationFrame(animate);
        }

        canvas.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const nx = e.clientX - rect.left;
            const ny = e.clientY - rect.top;
            const dx = nx - pointerX;
            pointerX = nx;
            pointerY = ny;
            breezeVel = clamp(breezeVel + dx * 0.032, -3.2, 3.2);
        });

        canvas.addEventListener('pointerdown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            pointerX = x;
            pointerY = y;
            breezeVel = clamp(breezeVel + (x < width * 0.5 ? -1.3 : 1.3), -3.2, 3.2);
            spawnSunflowerAt(x, y);
        });

        window.addEventListener('resize', resizeCanvas);

        window.onload = function () {
            initSprites();
            resizeCanvas();
            requestAnimationFrame(animate);
        };
