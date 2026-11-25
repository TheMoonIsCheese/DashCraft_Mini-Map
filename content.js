(function() {
    let mapInstance = null;
    let isRaceActive = false;
    let ghostTrails = [];
    let liveGhosts = [];
    let pendingRaceStart = false;
    let isManuallyClosed = false;
    class DashMinimap {
        constructor(canvEl) {
            this.ctx = canvEl.getContext('2d');
            this.canv = canvEl;
            this.canv.width = 1500;  
            this.canv.height = 1500;
            this.trackPieces = [];
            this.ghosts = [];
            this.poolSet = new Set();
            this.staticCanvas = document.createElement('canvas');
            this.staticCanvas.width = 1500;
            this.staticCanvas.height = 1500;
            this.staticCtx = this.staticCanvas.getContext('2d');
        }
        drawGhosts() {
            const ctx = this.ctx;
            const GHOST_COLORS = ['#00ffff', '#ff00ff', '#ffff00'];
            for (let i = 0; i < ghostTrails.length; i++) {
                const trail = ghostTrails[i];
                if (!trail || trail.length < 2) continue;
                ctx.save();
                ctx.strokeStyle = GHOST_COLORS[i % GHOST_COLORS.length];
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.55;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(750 + trail[0].x, 750 - trail[0].z);
                for (let j = 1; j < trail.length; j++) {
                    ctx.lineTo(750 + trail[j].x, 750 - trail[j].z);
                }
                ctx.stroke();
                ctx.restore();
            }
            for (const g of liveGhosts) {
                ctx.save();
                ctx.translate(750 + g.x, 750 - g.z);
                ctx.rotate((g.r || 0) * Math.PI / 180);
                ctx.fillStyle = GHOST_COLORS[g.index % GHOST_COLORS.length];
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(14, 13);
                ctx.lineTo(0, 6);
                ctx.lineTo(-14, 13);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
        sineWave(x, y, width, height, invert) {
            const ctx = this.ctx;
            ctx.moveTo(x, y);
            for (let i = 0; i < height; i++) {
                let sineVal = Math.sin((i - height / 2) * Math.PI / height) * width / 2 + width / 2;
                if (invert) {
                    ctx.lineTo(x + sineVal, y - i);
                } else {
                    ctx.lineTo(x + sineVal, y + i);
                }
            }
        }
        drawPoolGroup(poolPieces) {
            const ctx = this.ctx;
            const size = 30;
            const half = 15;
            const b = 3;
            ctx.fillStyle = "#ffffff";
            for (const p of poolPieces) {
                ctx.save();
                ctx.translate(p.p[0], -p.p[2]);
                ctx.rotate((p.r || 0) * Math.PI / 180);
                ctx.beginPath();
                ctx.roundRect(-half - b, -half - b, size + b * 2, size + b * 2, p.id === 153 ? 8 : 0);
                ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = "#22a1e3";
            for (const p of poolPieces) {
                ctx.save();
                ctx.translate(p.p[0], -p.p[2]);
                ctx.rotate((p.r || 0) * Math.PI / 180);
                ctx.beginPath();
                ctx.roundRect(-half, -half, size, size, p.id === 153 ? 5 : 0);
                ctx.fill();
                ctx.restore();
            }
        }
        drawPieceAtOrigin(p) {
            const ctx = this.ctx;
            const id = p.id;
            const road = "#a5a5a5", yellow = "#ffcf00", finish = "#ef3533", border = "#363636";
            const blue = "#22a1e3", white = "#ffffff", platformEdge = "#555555", roadPlatform = "#808080";
            const tube = "#4facfe", lightgrass = "#42ab42", darkgrass = "#228b22", tree = "#2d5a27";
            const ice = "#d8ffff", dirt = "#b57a49";
            ctx.lineWidth = 1;
            if (id == 1) { //START
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 30);
                ctx.fillRect(7, -15, 4, 30);
                ctx.fillStyle = blue;
                ctx.fillRect(-11, -4, 22, 8);
                ctx.fillStyle = white;
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(-12 + i * 8, -4, 4, 4);
                    ctx.fillRect(-8 + i * 8, 0, 4, 4);
                }
                ctx.fillStyle = border;
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
            }
            else if (id == 2) { //FINISH
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border;
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 30);
                ctx.fillRect(7, -15, 4, 30);
                ctx.fillStyle = finish;
                ctx.fillRect(-11, -4, 22, 8);
            }
            else if (id == 3 || id == 24 || id == 49) { //STRAIGHT, SLOPE, TILTED
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border;
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 30);
                ctx.fillRect(7, -15, 4, 30);
            }
            else if (id == 4) { //SMALL TURN
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(15, 15, 30, Math.PI, Math.PI / 2 * 3);
                ctx.lineTo(15, 15);
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.fillStyle = border;
                ctx.beginPath(); ctx.arc(15, 15, 2, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, 15, 28, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(15, 15, 6, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, 15, 24, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 6 || id == 57 || id == 58) {
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(30, 30, 60, Math.PI, Math.PI / 2 * 3);
                ctx.arc(30, 30, 30, Math.PI / 2 * 3, Math.PI, true);
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(30, 30, 58, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(30, 30, 32, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(30, 30, 36, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(30, 30, 54, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 8 || id == 52 || id == 53 || id == 75 || id == 62 || id == 79 || id == 77) { //LARGE TURN, BANKED LARGE TURN, RIGHT SLOPE LARGE, FLAT TO SLOPE RIGHT, TRANSITION TURN RIGHT, RIGHT SLOPE DOWN, RIGHT SLOPE UP
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(45, 45, 90, Math.PI, Math.PI / 2 * 3);
                ctx.arc(45, 45, 60, Math.PI / 2 * 3, Math.PI, true);
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(45, 45, 88, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 45, 62, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(45, 45, 66, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 45, 84, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 130 || id == 144) { //SPECTATOR BOOTH, ROAD MIDDLE
                ctx.fillStyle = road; ctx.fillRect(0, 0, 15, 15);
            }
            else if (id == 10 || id == 122) { //CURVE 2 2X2, CURVE 2 NARROW 2X2
                ctx.rotate(Math.PI / 2)
                ctx.strokeStyle = road; ctx.beginPath();
                ctx.arc(15, -15, 30, Math.PI / 2, Math.PI); ctx.stroke();
            }
            else if (id == 13 || id == 14) { //HORIZONTAL METAL, METAL SLOPE
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(-11, -11, 22, 22);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 30, 1); 
                ctx.fillRect(-15, 14, 30, 1); 
                ctx.fillRect(-15, -15, 1, 30); 
                ctx.fillRect(14, -15, 1, 30);
            }
            else if (id == 12 || id == 71) { //VERTICAL METAL, VERTICAL SHORT 1 METAL
                ctx.fillStyle = road; ctx.fillRect(-15, -2, 30, 4);
            }
            else if (id == 15 || id == 16) { //SLOPE START METAL, SLOPE END METAL
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 45);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(-11, -11, 22, 37);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 30, 1);
                ctx.fillRect(-15, 29, 30, 1);
                ctx.fillRect(-15, -15, 1, 45);
                ctx.fillRect(14, -15, 1, 45);
            }
            else if (id == 17 || id == 23 || id == 25) { //SLOPE 3-1, SLOPE START, SLOPE END
                ctx.fillStyle = road; ctx.fillRect(-15, -30, 30, 45);
                ctx.fillStyle = border; ctx.fillRect(-15, -30, 4, 45);
                ctx.fillRect(11, -30, 4, 45); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -30, 4, 45); ctx.fillRect(7, -30, 4, 45);
            }
            else if (id == 18 || id == 61 || id == 60 || id == 131 || id == 132) { //SLOPE 6-2, STRAIGHT TILTED TRANSITION LEFT, STRAIGHT TILTED TRANSITION RIGHT, STRAIGHT TILTED TRANSITION DOWN LEFT, STRAIGHT TILTED TRANSITION DOWN RIGHT,
                ctx.fillStyle = road; ctx.fillRect(-15, -45, 30, 90);
                ctx.fillStyle = border; ctx.fillRect(-15, -45, 4, 90);
                ctx.fillRect(11, -45, 4, 90); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -45, 4, 90); ctx.fillRect(7, -45, 4, 90);
            }
            else if (id == 20 || id == 21 || id == 48 || id == 47) { //ARROWS RIGHT, ARROWS LEFT, ARROWS DOWN, ARROWS UP
                ctx.fillStyle = white; ctx.fillRect(-15, -2, 30, 4);
            }
            else if (id == 22) { //CLIMB 9-3
                ctx.fillStyle = road; ctx.fillRect(-15, -75, 30, 135);
                ctx.fillStyle = border; ctx.fillRect(-15, -75, 4, 135);
                ctx.fillRect(11, -75, 4, 135); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -75, 4, 135); ctx.fillRect(7, -75, 4, 135);
            }
            else if (id == 26) { //T-INTERSECTION
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 30, 4);
                ctx.beginPath(); ctx.arc(-15, 15, 4, Math.PI / 2 * 3, 0); ctx.lineTo(-15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, 15, 4, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.strokeStyle = yellow; ctx.fillStyle = yellow; ctx.fillRect(-15, -11, 30, 4);
                ctx.beginPath(); ctx.arc(15, 15, 6, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-15, 15, 6, Math.PI / 2 * 3, 0); ctx.stroke();
            }
            else if (id == 27) { //+ INTERSECTION
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border;
                ctx.beginPath(); ctx.arc(-15, 15, 4, Math.PI / 2 * 3, 0); ctx.lineTo(-15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, 15, 4, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.beginPath(); ctx.arc(-15, -15, 4, 0, Math.PI / 2); ctx.lineTo(-15, -15); ctx.fill();
                ctx.beginPath(); ctx.arc(15, -15, 4, Math.PI / 2, Math.PI); ctx.lineTo(15, -15); ctx.fill();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(-15, 15, 6, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, 15, 6, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-15, -15, 6, 0, Math.PI / 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, -15, 6, Math.PI / 2, Math.PI); ctx.stroke();
            }
            else if (id == 28) { //Y-SPLIT INTERSECTION
                ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(45, 30, 58, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 30, 32, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 58, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 32, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(45, 30, 36, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(45, 30, 54, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 36, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-45, 30, 54, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.fillStyle = road;
                ctx.beginPath(); ctx.arc(-45, 30, 52, Math.PI / 2 * 3, 0); ctx.arc(-45, 30, 38, 0, Math.PI / 2 * 3, true); ctx.fill();
                ctx.beginPath(); ctx.arc(45, 30, 52, Math.PI, Math.PI / 2 * 3); ctx.arc(45, 30, 38, Math.PI / 2 * 3, Math.PI, true); ctx.fill();
            }
            else if (id == 29 || id == 37) { //ROAD MIDDLE, ROAD SLOPE MIDDLE
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 30);
            }
            else if (id == 30) { //ROAD CORNER 1 (OUTER)
                ctx.fillStyle = roadPlatform;
                ctx.beginPath(); ctx.arc(15, 15, 30, Math.PI, Math.PI / 2 * 3); ctx.lineTo(15, 15); ctx.fill();
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(15, 15, 28, Math.PI, Math.PI / 2 * 3); ctx.stroke();
                ctx.strokeStyle = blue; ctx.beginPath(); ctx.arc(15, 15, 24, Math.PI, Math.PI / 2 * 3); ctx.stroke();
            }
            else if (id == 31) { //ROAD CORNER 2 (INNER)
                ctx.fillStyle = roadPlatform;
                ctx.beginPath(); ctx.arc(-30, -30, 30, 0, Math.PI / 2); ctx.lineTo(0, 0); ctx.fill();
                ctx.fillRect(-30, 0, 30, 30); ctx.fillRect(0, -30, 30, 30);
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(-30, -30, 32, 0, Math.PI / 2); ctx.stroke();
                ctx.strokeStyle = blue; ctx.beginPath(); ctx.arc(-30, -30, 36, 0, Math.PI / 2); ctx.stroke();
            }
            else if (id == 32 || id == 34) { //ROAD LEFT BORDER, ROAD LEFT SLOPE BORDER
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 30);
                ctx.fillStyle = blue; ctx.fillRect(-11, -15, 4, 30);
            }
            else if (id == 33 || id == 35) { //SLOPE START ROAD LEFT BORDER, SLOPE END ROAD LEFT BORDER
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -30, 30, 45);
                ctx.fillStyle = border; ctx.fillRect(-15, -30, 4, 45);
                ctx.fillStyle = blue; ctx.fillRect(-11, -30, 4, 45);
            }
            else if (id == 36 || id == 38) { //SLOPE START ROAD CENTER, SLOPE END ROAD CENTER
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -30, 30, 45);
            }
            else if (id == 39 || id == 41) { //SLOPE START ROAD RIGHT BORDER, SLOPE END RIGHT BORDER
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -30, 30, 45);
                ctx.fillStyle = border; ctx.fillRect(11, -30, 4, 45);
                ctx.fillStyle = blue; ctx.fillRect(7, -30, 4, 45);
            }
            else if (id == 40) { //ROAD RIGHT SLOPE BORDER
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = blue; ctx.fillRect(7, -15, 4, 30);
            }
            else if (id == 42) { //STRAIGHT SHORT
                ctx.fillStyle = road; ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 15);
                ctx.fillRect(11, -15, 4, 15); ctx.fillStyle = yellow;
                ctx.fillRect(-11, -15, 4, 15); ctx.fillRect(7, -15, 4, 15);
            }
            else if (id == 54 || id == 76 || id == 63 || id == 80 || id == 78) { //LEFT SLOPE LARGE, FLAT TO SLOPE LEFT, TRANSITION TURN LEFT, LEFT SLOPE DOWN, LEFT SLOPE UP
                ctx.fillStyle = road; 
                ctx.beginPath();
                ctx.arc(-45, 45, 90, Math.PI / 2 * 3, 0); 
                ctx.arc(-45, 45, 60, 0, Math.PI / 2 * 3, true); 
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border;
                ctx.beginPath(); 
                ctx.arc(-45, 45, 88, Math.PI / 2 * 3, 0); 
                ctx.stroke();
                ctx.beginPath(); 
                ctx.arc(-45, 45, 62, Math.PI / 2 * 3, 0); 
                ctx.stroke();
                ctx.strokeStyle = yellow; 
                ctx.beginPath(); 
                ctx.arc(-45, 45, 66, Math.PI / 2 * 3, 0); 
                ctx.stroke();
                ctx.beginPath(); 
                ctx.arc(-45, 45, 84, Math.PI / 2 * 3, 0); 
                ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 59) { //LEFT SLOPE UP MEDIUM
                ctx.fillStyle = road; ctx.beginPath();
                ctx.arc(-30, 30, 60, Math.PI / 2 * 3, 0); ctx.arc(-30, 30, 30, 0, Math.PI / 2 * 3, true); ctx.fill(); ctx.lineWidth = 4;
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(-30, 30, 58, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-30, 30, 32, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); ctx.arc(-30, 30, 36, Math.PI / 2 * 3, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(-30, 30, 54, Math.PI / 2 * 3, 0); ctx.stroke(); ctx.lineWidth = 1;
            }
            else if (id == 64) { //SMALL SNAKE RIGHT
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-15, 15, 15, 30, true); ctx.lineTo(15, 15);
                this.sineWave(15, 15, 15, 30, true); ctx.lineTo(0, -15); ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-13, 15, 15, 30, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(13, 15, 15, 30, true); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-9, 15, 15, 30, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(9, 15, 15, 30, true); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 65) { //SMALL SNAKE LEFT
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-30, -15, 15, 30, false); ctx.lineTo(0, -15);
                this.sineWave(0, -15, 15, 30, false); ctx.lineTo(-15, 15); ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-28, -15, 15, 30, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-2, -15, 15, 30, false); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-24, -15, 15, 30, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-6, -15, 15, 30, false); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 66) { //MEDIUM SNAKE RIGHT
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-30, 30, 30, 60, true); ctx.lineTo(30, -30);
                this.sineWave(0, 30, 30, 60, true); ctx.lineTo(-30, 30); ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-28, 30, 30, 60, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-2, 30, 30, 60, true); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-24, 30, 30, 60, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-6, 30, 30, 60, true); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 67) { //MEDIUM SNAKE LEFT
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-30, -30, 30, 60, false); ctx.lineTo(30, 30);
                this.sineWave(0, -30, 30, 60, false); ctx.lineTo(-30, -30); ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-28, -30, 30, 60, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-2, -30, 30, 60, false); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-24, -30, 30, 60, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-6, -30, 30, 60, false); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 68) { //LARGE SNAKE RIGHT
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-45, 45, 60, 90, true); ctx.lineTo(45, -45);
                this.sineWave(-15, 45, 60, 90, true); ctx.lineTo(-45, 45); ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-43, 45, 60, 90, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-17, 45, 60, 90, true); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-39, 45, 60, 90, true); ctx.stroke();
                ctx.beginPath(); this.sineWave(-21, 45, 60, 90, true); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 69) { //LARGE SNAKE LEFT
                ctx.fillStyle = road; ctx.beginPath();
                this.sineWave(-45, -45, 60, 90, false); ctx.lineTo(45, 45);
                this.sineWave(-15, -45, 60, 90, false); ctx.lineTo(-45, -45); ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border; ctx.beginPath(); this.sineWave(-43, -45, 60, 90, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-17, -45, 60, 90, false); ctx.stroke();
                ctx.strokeStyle = yellow; ctx.beginPath(); this.sineWave(-39, -45, 60, 90, false); ctx.stroke();
                ctx.beginPath(); this.sineWave(-21, -45, 60, 90, false); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 70) { //HORIZONTAL SHORT METAL
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(-11, -11, 22, 7);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 30, 1);
                ctx.fillRect(-15, -1, 30, 1);
                ctx.fillRect(-15, -15, 1, 15);
                ctx.fillRect(14, -15, 1, 15);
            }
            else if (id == 104 || id == 106) { //CURVE 1 1X1, CURVE 3 1X1
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(-11, -11, 22, 11);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 30, 1);
                ctx.fillRect(-15, -15, 1, 15);
                ctx.fillRect(14, -15, 1, 15);
            }
            else if (id == 9 || id == 11) { //CURVE 1 2X2, CURVE 3 2X2
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(-11, -15, 22, 26);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, 14, 30, 1);
                ctx.fillRect(-15, -15, 1, 30);
                ctx.fillRect(14, -15, 1, 30);
            }
            else if (id == 111 || id == 113) { //CURVE 1 3X3, CURVE 3 3X3
                ctx.fillStyle = road;
                ctx.fillRect(-15, -30, 30, 45);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(-11, -26, 22, 41);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -30, 30, 1);
                ctx.fillRect(-15, -30, 1, 45);
                ctx.fillRect(14, -30, 1, 45);
            }
            else if (id == 118 || id == 120) { //1X1 CURVE 1 NARROW, 1X1 CURVE 3 NARROW
                ctx.fillStyle = road;
                ctx.fillRect(0, -15, 15, 15);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(3, -12, 9, 12);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -15, 15, 1);
                ctx.fillRect(0, -15, 1, 15);
                ctx.fillRect(14, -15, 1, 15);
            }
            else if (id == 121 || id == 123) { //2X2 NARROW CURVE 1, 2X2 NARROW CURVE 3
                ctx.fillStyle = road;
                ctx.fillRect(0, -15, 15, 30);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(3, -12, 9, 27);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -15, 15, 1);
                ctx.fillRect(0, -15, 1, 30);
                ctx.fillRect(14, -15, 1, 30);
            }
            else if (id == 124 || id == 126) { //3X3 NARROW CURVE 1, 3X3 NARROW CURVE 3
                ctx.fillStyle = road;
                ctx.fillRect(0, -30, 15, 45);
                ctx.fillStyle = roadPlatform;
                ctx.fillRect(3, -27, 9, 42);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -30, 15, 1);
                ctx.fillRect(0, -30, 1, 45);
                ctx.fillRect(14, -30, 1, 45);
            }
            else if (id == 107 || id == 108) { //1X1 CURVE CORNER DOWN, 1X1 CURVE CORNER UP
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.arc(-15, 0, 15, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(-11, 4);
                ctx.arc(-15, 0, 15, 0.27, Math.PI / 2 - 0.27);
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = yellow;
                ctx.beginPath();
                ctx.moveTo(-14.5, 15);
                ctx.lineTo(-14.5, 0.5);
                ctx.lineTo(0, 0.5);
                ctx.stroke();
            }
            else if (id == 109 || id == 110) { //2X2 CURVE CORNER DOWN, 2X2 CURVE CORNER UP
                ctx.rotate(Math.PI);
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.arc(-15, -15, 30, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(-11, -11);
                ctx.arc(-15, -15, 30, 0.13, Math.PI / 2 - 0.13);
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = yellow;
                ctx.beginPath();
                ctx.moveTo(-14.5, 15);
                ctx.lineTo(-14.5, -14.5);
                ctx.lineTo(15, -14.5);
                ctx.stroke();
            }
            else if (id == 114 || id == 115) { //3X3 CURVE CORNER DOWN, 3X3 CURVE CORNER UP
                ctx.rotate(Math.PI)
                ctx.translate(-15, 0)
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -30);
                ctx.arc(-15, -30, 45, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = roadPlatform;
                ctx.beginPath();
                ctx.moveTo(-11, -26);
                ctx.arc(-15, -30, 45, 0.09, Math.PI / 2 - 0.09);
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = yellow;
                ctx.beginPath();
                ctx.moveTo(-14.5, 15);
                ctx.lineTo(-14.5, -29.5);
                ctx.lineTo(30, -29.5);
                ctx.stroke();
            }
            else if (id == 72 || id == 117) { //VERTICAL SHORT 2, VERTICAL 1X1
                ctx.fillStyle = road;
                ctx.fillRect(0, -2, 15, 4);
            }
            else if (id == 73) { //MIDDLE SHORT
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 15);
            }
            else if (id == 74) { //SIDE SHORT
                ctx.fillStyle = roadPlatform; ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 4, 15);
                ctx.fillStyle = blue; ctx.fillRect(-11, -15, 4, 15);
            }
            else if (id == 81) { //PIPE STRAIGHT
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 30);
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1); ctx.fillRect(-3, 14, 6, 1);
            }
            else if (id == 82 || id == 90) { //SHORT PIPE, TRANSITION PIPE
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 15);
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1); ctx.fillRect(-3, -1, 6, 1);
            }
            else if (id == 83 || id == 84) { //VERTICAL PIPE, VERTICAL PIPE SHORT
                ctx.fillStyle = border; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            else if (id == 85) { //HORIZONTAL CURVE
                ctx.fillStyle = white; ctx.beginPath(); ctx.arc(15, 0, 12, Math.PI, Math.PI / 2 * 3);
                ctx.arc(15, 0, 18, Math.PI / 2 * 3, Math.PI, true); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-3, 0, 6, 1); ctx.fillRect(14, -18, 1, 6);
            }
            else if (id == 86) { //VERTICAL CURVE 1
                ctx.fillStyle = white; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI);
                ctx.lineTo(-3, -15); ctx.lineTo(3, -15); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1);
            }
            else if (id == 87) { //VERTICAL CURVE 2
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 15);
                ctx.fillStyle = border; ctx.fillRect(-3, -1, 6, 1);
                ctx.beginPath(); ctx.arc(0, -15, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            else if (id == 88) { //HORIZONTAL CROSS PIPE
                ctx.fillStyle = white; ctx.fillRect(-3, -15, 6, 30); ctx.fillRect(-15, -3, 30, 6);
                ctx.fillStyle = border; ctx.fillRect(-3, -15, 6, 1); ctx.fillRect(-3, 14, 6, 1);
                ctx.fillRect(14, -3, 1, 6); ctx.fillRect(-15, -3, 1, 6); ctx.fillRect(-3, -3, 6, 6);
            }
            else if (id == 89) { //VERTICAL CROSS PIPE
                ctx.fillStyle = white; ctx.fillRect(-15, -3, 30, 6);
                ctx.fillStyle = border; ctx.fillRect(14, -3, 1, 6); ctx.fillRect(-15, -3, 1, 6);
                ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            else if (id == 91) { //TUBE STRAIGHT
                ctx.fillStyle = tube; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 30, 1); ctx.fillRect(-15, 13, 30, 1);
            }
            else if (id == 92) { //SHORT TUBE STRAIGHT
                ctx.fillStyle = tube; ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = border; ctx.fillRect(-15, -15, 30, 1); ctx.fillRect(-15, -1, 30, 1);
            }
            else if (id == 93 || id == 94) { //VERTICAL TUBE STRAIGHT, SHORT VERTICAL TUBE STRAIGHT
                ctx.lineWidth = 1; ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
            }
            else if (id == 95) { //TUBE TURN HORIZONTAL
                ctx.fillStyle = tube; ctx.beginPath();
                ctx.arc(30, 30, 60, Math.PI, Math.PI / 2 * 3); ctx.arc(30, 30, 30, Math.PI / 2 * 3, Math.PI, true); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-30, 29, 30, 1); ctx.fillRect(30, -30, 1, 30);
            }
            else if (id == 96 || id == 97) { //TUBE TURN VERTICAL 1 & 2
                ctx.strokeStyle = border; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = tube; ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.lineTo(15, -45);
                ctx.lineTo(-15, -45); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI);
                ctx.lineTo(-15, -45); ctx.lineTo(15, -45); ctx.fill();
                ctx.fillStyle = border; ctx.fillRect(-15, -45, 30, 1);
            }
            else if (id == 98) { //GROUND BLOCK
                ctx.fillStyle = lightgrass; ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = darkgrass; ctx.fillRect(-15, -15, 15, 15); ctx.fillRect(0, 0, 15, 15);
            }
            else if (id == 101) { //FOUR TREES
                ctx.fillStyle = tree;
                ctx.fillRect(-11, -11, 7, 7); ctx.fillRect(-11, 4, 7, 7);
                ctx.fillRect(4, -11, 7, 7); ctx.fillRect(4, 4, 7, 7);
            }
            else if (id == 103) { //SINGLE TREE
                ctx.fillStyle = tree; ctx.fillRect(4, -11, 7, 7);
            }
            else if (id == 105 || id == 119) { //CURVE 2 THIN LINE 1X1, NARROW CURVE 2 THIN LINE 1X1
                ctx.rotate(Math.PI / 2)
                ctx.strokeStyle = road;
                ctx.beginPath();
                ctx.arc(0, 0, 15, Math.PI / 2, Math.PI);
                ctx.stroke();
            }
            else if (id == 112 || id == 125) { //CURVE 2 THIN LINE 3X3, NARROW CURVE 2 THIN LINE 3X3
                ctx.rotate(Math.PI / 2)
                ctx.strokeStyle = road;
                ctx.beginPath();
                ctx.arc(30, -30, 45, Math.PI / 2, Math.PI);
                ctx.stroke();
            }
            else if (id == 116) { //1X1 METAL PLATFORM
                ctx.fillStyle = road; ctx.fillRect(0, -15, 15, 15);
                ctx.fillStyle = roadPlatform; ctx.fillRect(2.5, -12.5, 10, 10);
            } 
            else if (id == 146) { //1X1 GRASS RAMP OUTER CORNER
                ctx.rotate(Math.PI / 2)
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.arc(-15, 0, 15, -Math.PI / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = platformEdge;
                ctx.fillRect(-15, -15, 4, 15);
                ctx.fillRect(-15, -4, 15, 4);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 1, 15);
                ctx.fillRect(-15, -1, 15, 1);
            }
            else if (id == 151) { //GRASS RAMP OUTER CORNER BIG
                ctx.rotate(Math.PI);
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.arc(-15, -15, 30, 0, Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = platformEdge;
                ctx.beginPath();
                ctx.arc(-15, -15, 28, 0, Math.PI / 2);
                ctx.stroke();
                ctx.lineWidth = 1;
                ctx.strokeStyle = yellow;
                ctx.beginPath();
                ctx.arc(-15, -15, 29.5, 0, Math.PI / 2);
                ctx.stroke();
            }
            else if (id == 127 || id == 129) { //NARROW SLOPE START, NARROW SLOPE END
                ctx.fillStyle = road;
                ctx.fillRect(0, -30, 15, 45);
                ctx.fillStyle = platformEdge;
                ctx.fillRect(0, -30, 15, 3);
                ctx.fillRect(0, 12, 15, 3);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -30, 15, 1);
                ctx.fillRect(0, 14, 15, 1);
            }
            else if (id == 128) { //NARROW SLOPE
                ctx.fillStyle = road;
                ctx.fillRect(0, -15, 15, 30);
                ctx.fillStyle = platformEdge;
                ctx.fillRect(0, -15, 15, 3);
                ctx.fillRect(0, 12, 15, 3);
                ctx.fillRect(0, -15, 3, 30);
                ctx.fillRect(12, -15, 3, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -15, 15, 1);
                ctx.fillRect(0, 14, 15, 1);
                ctx.fillRect(0, -15, 1, 30);
                ctx.fillRect(14, -15, 1, 30);
            }
            else if (id == 140 || id == 141 || id == 142 || id == 143) { //SLOPE PLATFORM CORNER TOP RIGHT, SLOPE PLATFORM CORNER TOP LEFT, SLOPE PLATFORM CORNER BOTTOM RIGHT, SLOPE PLATFORM CORNER BOTTOM LEFT
                ctx.fillStyle = road;
                ctx.beginPath();
                if (id == 140) {
                    ctx.moveTo(15, 15); ctx.lineTo(-15, 15);
                    ctx.arc(15, 15, 30, Math.PI, Math.PI * 1.5);
                } else if (id == 141) {
                    ctx.moveTo(-15, 15); ctx.lineTo(-15, -15);
                    ctx.arc(-15, 15, 30, Math.PI * 1.5, 0);
                } else if (id == 142) {
                    ctx.moveTo(15, -15); ctx.lineTo(15, 15);
                    ctx.arc(15, -15, 30, Math.PI * 0.5, Math.PI);
                } else {
                    ctx.moveTo(-15, -15); ctx.lineTo(15, -15);
                    ctx.arc(-15, -15, 30, 0, Math.PI * 0.5);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = blue;
                ctx.lineWidth = 3;
                ctx.beginPath();
                if (id == 140) ctx.arc(15, 15, 28.5, Math.PI, Math.PI * 1.5);
                else if (id == 141) ctx.arc(-15, 15, 28.5, Math.PI * 1.5, 0);
                else if (id == 142) ctx.arc(15, -15, 28.5, Math.PI * 0.5, Math.PI);
                else ctx.arc(-15, -15, 28.5, 0, Math.PI * 0.5);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
            else if (id == 154 || id == 155) { //SLOPE BORDER TOP ROAD, SLOPE BORDER BOTTOM ROAD
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = blue;
                if (id == 154) ctx.fillRect(-15, -15, 30, 4);
                else ctx.fillRect(-15, 11, 30, 4);
            }
            else if (id == 149) { //GRASS RAMP BIG
                ctx.rotate(Math.PI)
                ctx.fillStyle = road; 
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = platformEdge; 
                ctx.fillRect(-15, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30); 
                ctx.fillRect(-15, 11, 30, 4);
                ctx.fillStyle = yellow; 
                ctx.fillRect(-15, -15, 1, 30);
                ctx.fillRect(14, -15, 1, 30); 
                ctx.fillRect(-15, 14, 30, 1);
            }
            else if (id == 43) { //GRASS RAMP
                ctx.fillStyle = road; 
                ctx.fillRect(-15, -15, 30, 15);
                ctx.fillStyle = platformEdge; 
                ctx.fillRect(-15, -15, 4, 15);
                ctx.fillRect(11, -15, 4, 15); 
                ctx.fillRect(-15, -15, 30, 4);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, -15, 1, 15); 
                ctx.fillRect(14, -15, 1, 15);
                ctx.fillRect(-15, -15, 30, 1);
            }
            else if (id == 145) { //GRASS RAMP 1X1
                ctx.fillStyle = road; 
                ctx.fillRect(0, -15, 15, 15);
                ctx.fillStyle = platformEdge;
                ctx.fillRect(0, -15, 15, 4);
                ctx.fillRect(0, -15, 4, 15);
                ctx.fillRect(11, -15, 4, 15);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -15, 15, 1);
                ctx.fillRect(0, -15, 1, 15);
                ctx.fillRect(14, -15, 1, 15);
            }
            else if (id == 150) { //GRASS RAMP BIG NARROW
                ctx.fillStyle = road;
                ctx.fillRect(0, -15, 15, 30);
                ctx.fillStyle = platformEdge;
                ctx.fillRect(0, -15, 15, 4);
                ctx.fillRect(0, -15, 4, 30);
                ctx.fillRect(11, -15, 4, 30);
                ctx.fillStyle = yellow;
                ctx.fillRect(0, -15, 15, 1);
                ctx.fillRect(0, -15, 1, 30);
                ctx.fillRect(14, -15, 1, 30);
            }
            else if (id == 147) { //GRASS RAMP INNER CORNER SMALL
                ctx.rotate(Math.PI);
                ctx.fillStyle = road;
                ctx.fillRect(-15, 0, 15, 15);
                ctx.fillStyle = platformEdge;
                ctx.fillRect(-15, 11, 15, 4);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, 14, 15, 1);
                ctx.strokeStyle = platformEdge;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, 13, Math.PI / 2, Math.PI);
                ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, 14.5, Math.PI / 2, Math.PI);
                ctx.stroke();
            }
            else if (id == 148) { //GRASS RAMP INNER CORNER LARGE
                ctx.rotate(Math.PI);
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.lineTo(0, -15);
                ctx.arc(15, -15, 15, Math.PI, Math.PI / 2, true);
                ctx.lineTo(15, 15);
                ctx.lineTo(-15, 15);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = platformEdge;
                ctx.fillRect(-15, 11, 30, 4);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, 14, 30, 1);
                ctx.strokeStyle = platformEdge;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(15, -15, 17, Math.PI / 2, Math.PI);
                ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(15, -15, 15.5, Math.PI / 2, Math.PI);
                ctx.stroke();
            }
            else if (id == 152) { //GRASS RAMP BIG INNER CORNER
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
                ctx.fillStyle = platformEdge;
                ctx.fillRect(-15, 11, 30, 4);
                ctx.fillStyle = yellow;
                ctx.fillRect(-15, 14, 30, 1);
                ctx.strokeStyle = platformEdge;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(15, -15, 28, Math.PI / 2, Math.PI);
                ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(15, -15, 29.5, Math.PI / 2, Math.PI);
                ctx.stroke();
            }
            else if (id == 158) { //ICE
                ctx.fillStyle = ice;
                ctx.fillRect(-15, -15, 30, 30);
            }
            else if (id == 159) { //DIRT
                ctx.fillStyle = dirt;
                ctx.fillRect(-15, -15, 30, 30);
            }
            else if (id == 153 || id == 157) { //WATER POOL ROUNDED, WATER POOL SQUARE
                return;
            }
            else if (id == 156) { //XL TURN
                ctx.fillStyle = road;
                ctx.beginPath();
                ctx.arc(-60, -60, 120, 0, Math.PI / 2);
                ctx.arc(-60, -60, 90, Math.PI / 2, 0, true);
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = border;
                ctx.beginPath(); ctx.arc(-60, -60, 118, 0, Math.PI / 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(-60, -60, 92, 0, Math.PI / 2); ctx.stroke();
                ctx.strokeStyle = yellow;
                ctx.beginPath(); ctx.arc(-60, -60, 96, 0, Math.PI / 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(-60, -60, 114, 0, Math.PI / 2); ctx.stroke();
                ctx.lineWidth = 1;
            }
            else { //FALLBACK
                ctx.fillStyle = road;
                ctx.fillRect(-15, -15, 30, 30);
            }
        }
        rebuildStaticLayer() {
            const origCtx = this.ctx;
            const ctx = this.staticCtx;
            this.ctx = ctx;
            ctx.clearRect(0, 0, 1500, 1500);
            if (!this.trackPieces || this.trackPieces.length === 0) {
                this.ctx = origCtx;
                return;
            }
            const sortedPieces = [...this.trackPieces].sort((a, b) => a.p[1] - b.p[1]);
            const poolPieces = sortedPieces.filter(p => p.id === 153 || p.id === 157);
            ctx.save();
            ctx.translate(750, 750);
            if (poolPieces.length > 0) {
                this.drawPoolGroup(poolPieces);
            }
            sortedPieces.forEach(p => {
                ctx.save();
                ctx.translate(p.p[0], -p.p[2]);
                ctx.rotate((p.r || 0) * Math.PI / 180);
                this.drawPieceAtOrigin(p);
                ctx.restore();
            });
            ctx.restore();
            this.ctx = origCtx;
        }
        render(px, pz, pr) {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, 1500, 1500);
            if (!this.trackPieces || this.trackPieces.length === 0) return;
            ctx.drawImage(this.staticCanvas, 0, 0);
            this.drawGhosts();
            ctx.save();
            ctx.translate(750 + px, 750 - pz);
            ctx.rotate((pr || 0) * Math.PI / 180);
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 59, 48, 0.28)";
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.stroke();
            ctx.fillStyle = "#ff3b30";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(20, 18);
            ctx.lineTo(0, 8);
            ctx.lineTo(-20, 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
    const ensureUI = () => {
        let container = document.getElementById('dashmap-container');
        let canvas = document.getElementById('dashmap-canvas');
        if (!container) {
            container = document.createElement('div');
            container.id = 'dashmap-container';
            Object.assign(container.style, {
                position: 'fixed', bottom: '10px', left: '10px',
                width: '300px', height: '300px', zIndex: '2147483647',
                background: 'rgba(0, 0, 0, 0.7)', borderRadius: '15px',
                border: '2px solid white', overflow: 'hidden'
            });
            canvas = document.createElement('canvas');
            canvas.id = 'dashmap-canvas';
            canvas.width = 1500; canvas.height = 1500;
            Object.assign(canvas.style, {
                width: '100%', height: '100%', pointerEvents: 'none'
            });
            const closeBtn = document.createElement('div');
            closeBtn.innerText = '✕';
            Object.assign(closeBtn.style, {
                position: 'absolute', top: '5px', right: '10px',
                color: 'white', cursor: 'pointer', fontSize: '20px',
                fontWeight: 'bold', zIndex: '2147483648', pointerEvents: 'auto'
            });
            closeBtn.onclick = () => {
                isManuallyClosed = true;
                container.style.display = 'none';
            };
            container.appendChild(closeBtn);
            container.appendChild(canvas);
            document.body.appendChild(container);
            mapInstance = new DashMinimap(canvas);
        }
        container.style.display = (isRaceActive && !isManuallyClosed) ? 'block' : 'none';
    };
    let readyInterval = null;
    let lastPos = { x: 0, z: 0, r: 0 };
    window.addEventListener("message", (e) => {
        if (e.data.type === 'RACE_START') {
            pendingRaceStart = true;
            isManuallyClosed = false;
            ghostTrails = [];
            liveGhosts = [];
            if (mapInstance && mapInstance.trackPieces.length > 0) {
                isRaceActive = true;
                pendingRaceStart = false;
                ensureUI();
                mapInstance.render(lastPos.x, lastPos.z, lastPos.r);
            }
        }
        if (e.data.type === 'RACE_END') {
            isRaceActive = false;
            pendingRaceStart = false;
            ghostTrails = [];
            liveGhosts = [];
            if (mapInstance) {
                mapInstance.trackPieces = [];
            }
            ensureUI();
        }
        if (e.data.type === 'TRACK_DATA') {
            isManuallyClosed = false;
            ensureUI();
            const container = document.getElementById('dashmap-container');
            if (container) {
                const envId = e.data.data.environment_ID ?? e.data.data.environmentId;
                if (envId === 0 || envId === 1) {
                    container.style.background = 'rgba(14, 119, 14, 0.7)';
                } else if (envId === 2) {
                    container.style.background = 'rgba(14, 141, 207, 0.7)';
                } else {
                    container.style.background = 'rgba(0, 0, 0, 0.7)';
                }
            }
            if (mapInstance) {
                let pieces = e.data.data.trackPieces || [];
                if (e.data.data.editorVersion === 2) {
                    pieces = pieces.map(piece => {
                        const normR = (((piece.r || 0) % 360) + 360) % 360;
                        const flippedR = (normR === 90 || normR === 270) ? (normR + 180) % 360 : normR;
                        return {
                            ...piece,
                            p: [piece.p[0], piece.p[1], -piece.p[2]],
                            r: flippedR
                        };
                    });
                }
                mapInstance.trackPieces = pieces;
                ghostTrails = [];
                liveGhosts = [];
                const startPiece = pieces.find(p => p.id === 1);
                if (startPiece) {
                    lastPos = {
                        x: startPiece.p[0],
                        z: startPiece.p[2],
                        r: startPiece.r || 0
                    };
                } else {
                    lastPos = { x: 0, z: 0, r: 0 };
                }
                mapInstance.rebuildStaticLayer();
                if (pendingRaceStart && pieces.length > 0) {
                    isRaceActive = true;
                    pendingRaceStart = false;
                    ensureUI();
                    mapInstance.render(lastPos.x, lastPos.z, lastPos.r);
                } else {
                    isRaceActive = false;
                    ensureUI();
                }
            }
        }
        if (e.data.type === 'ADD_GHOST') {
            if (mapInstance) {
                const existing = mapInstance.ghosts.find(g => g.username === e.data.username);
                if (existing) {
                    existing.points = e.data.points;
                    existing.finishTime = e.data.finishTime ?? existing.finishTime;
                } else {
                    mapInstance.ghosts.push({
                        username: e.data.username,
                        finishTime: e.data.finishTime ?? Infinity,
                        points: e.data.points
                    });
                }
                mapInstance.ghosts.sort((a, b) => a.finishTime - b.finishTime);
                mapInstance.ghosts = mapInstance.ghosts.slice(0, 3);
                mapInstance.rebuildStaticLayer();
                mapInstance.render(lastPos.x, lastPos.z, lastPos.r); 
            }
        }
        if (e.data.type === 'UPDATE_POS') {
            if (Array.isArray(e.data.liveGhosts)) liveGhosts = e.data.liveGhosts;
            if (Array.isArray(e.data.ghostTrails)) ghostTrails = e.data.ghostTrails;
            if (Number.isFinite(e.data.x) && Number.isFinite(e.data.z)) {
                lastPos = { x: e.data.x, z: e.data.z, r: Number.isFinite(e.data.r) ? e.data.r : lastPos.r };
                if (mapInstance && mapInstance.trackPieces.length > 0) {
                    if (!isRaceActive) {
                        isRaceActive = true;
                        ensureUI();
                    }
                    if (!isManuallyClosed) {
                        mapInstance.render(lastPos.x, lastPos.z, lastPos.r);
                    }
                }
            }
        }
    });
    readyInterval = setInterval(() => {
        if (!isRaceActive) {
            window.postMessage({ type: 'READY' }, "*");
        }
    }, 1000);
    window.addEventListener('popstate', ensureUI);
    window.addEventListener('hashchange', ensureUI);
    setInterval(() => {
        ensureUI();
        if (isRaceActive && !isManuallyClosed && mapInstance) {
            mapInstance.render(lastPos.x, lastPos.z, lastPos.r);
        }
    }, 200);
})();
