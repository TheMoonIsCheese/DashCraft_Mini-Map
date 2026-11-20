(function() {
    const orgFetch = window.fetch;
    let cachedTrackData = null;
    let topGhostUserIds = new Set();
    const allScenes = new Set();
    let gameScene = null;
    let gameCamera = null;
    let playerCar = null;
    let prevPositions = new WeakMap();
    function resetTrackerState() {
        allScenes.clear();
        gameScene = null;
        gameCamera = null;
        playerCar = null;
        prevPositions = new WeakMap();
        topGhostUserIds.clear();
        wasInRace = false;
    }
    const captureThreeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.isScene && !allScenes.has(obj)) {
            allScenes.add(obj);
            gameScene = obj;
        }
        if (obj.isPerspectiveCamera) {
            gameCamera = obj;
        }
    };
    const origWeakSetAdd = WeakSet.prototype.add;
    WeakSet.prototype.add = function(value) {
        captureThreeObject(value);
        return origWeakSetAdd.apply(this, arguments);
    };
    const origWeakMapSet = WeakMap.prototype.set;
    WeakMap.prototype.set = function(key, value) {
        captureThreeObject(key);
        return origWeakMapSet.apply(this, arguments);
    };
    const origPush = Array.prototype.push;
    Array.prototype.push = function(...items) {
        if (!gameScene || !gameCamera) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item && typeof item === 'object') {
                    if (item.isPerspectiveCamera) captureThreeObject(item);
                    if (item.object && item.object.isObject3D) {
                        let root = item.object;
                        while (root.parent) root = root.parent;
                        if (root.isScene) captureThreeObject(root);
                    }
                }
            }
        }
        return origPush.apply(this, items);
    };
    window.fetch = async (...args) => {
        const res = await orgFetch(...args);
        const url = typeof args[0] === "string" ? args[0] : (args[0]?.url || "");
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json") || url.includes("track") || url.includes("/ghost/") || url.includes("leaderboard")) {
            res.clone().json().then(data => {
                if (data && Array.isArray(data.trackPieces)) {
                    resetTrackerState();
                    cachedTrackData = data;
                    window.postMessage({ type: 'TRACK_DATA', data }, "*");
                } 
                else if (data && Array.isArray(data.snapshots)) {
                    const points = data.snapshots
                        .filter(s => Array.isArray(s.p))
                        .map(s => ({ x: s.p[0], z: s.p[2] }));
                    window.postMessage({
                        type: 'ADD_GHOST',
                        username: data.userId || url,
                        finishTime: typeof data.finishTime === "number" ? data.finishTime : Infinity,
                        points
                    }, "*");
                }
            }).catch(() => {});
        }
        return res;
    };
    function getActiveRaceCamera() {
        let bestCam = gameCamera;
        for (const scene of allScenes) {
            for (let i = 0; i < scene.children.length; i++) {
                const c = scene.children[i];
                if (c && c.isPerspectiveCamera) {
                    const ce = c.matrixWorld.elements;
                    if (ce[12] !== 0 || ce[14] !== 0) {
                        bestCam = c;
                    }
                }
            }
        }
        return bestCam;
    }
    function findPlayerCar() {
        if (!cachedTrackData || allScenes.size === 0) return null;
        if (allScenes.size === 0) return null;
        const activeCam = getActiveRaceCamera();
        let camX = null, camY = null, camZ = null;
        if (activeCam) {
            const ce = activeCam.matrixWorld.elements;
            camX = ce[12];
            camY = ce[13];
            camZ = ce[14];
        }
        const hasValidCam = camX !== null && (camX !== 0 || camZ !== 0);
        let bestNearCam = null;
        let bestNearDist = Infinity;
        let fallbackFastest = null;
        let maxMoved = 0.002;
        const scanNode = (obj, scene) => {
            if (!obj || obj.isCamera || obj.isLight || !obj.visible) return;
            if (typeof obj.name === 'string' && obj.name.startsWith('environment_')) return;
            if (obj.parent) {
                const e = obj.matrixWorld.elements;
                const wx = e[12], wy = e[13], wz = e[14];
                if (Number.isFinite(wx) && Number.isFinite(wz)) {
                    const prev = prevPositions.get(obj);
                    prevPositions.set(obj, { x: wx, y: wy, z: wz });
                    const moved = prev ? Math.hypot(wx - prev.x, wy - prev.y, wz - prev.z) : 0;
                    let rootObj = obj;
                    while (rootObj.parent && rootObj.parent !== scene) {
                        const pe = rootObj.parent.matrixWorld.elements;
                        if (Math.hypot(pe[12] - wx, pe[14] - wz) > 2.0) break;
                        rootObj = rootObj.parent;
                    }
                    if (rootObj.isGroup && rootObj.children.length > 0) {
                        if (hasValidCam) {
                            const distToCam = Math.hypot(wx - camX, wy - camY, wz - camZ);
                            if (distToCam <= 45 && distToCam < bestNearDist) {
                                bestNearDist = distToCam;
                                bestNearCam = rootObj;
                                gameScene = scene;
                            }
                        }
                        if (moved > maxMoved) {
                            maxMoved = moved;
                            fallbackFastest = rootObj;
                            gameScene = scene;
                        }
                    }
                }
            }
            for (let i = 0; i < obj.children.length; i++) {
                scanNode(obj.children[i], scene);
            }
        };
        for (const scene of allScenes) {
            for (let i = 0; i < scene.children.length; i++) {
                scanNode(scene.children[i], scene);
            }
        }
        return bestNearCam || fallbackFastest;
    }
    function isValidRaceCar(car, cam) {
        if (!car || !car.parent || !car.visible) return false;
        if (cam) {
            const ce = cam.matrixWorld.elements;
            const pe = car.matrixWorld.elements;
            if (ce[12] !== 0 || ce[14] !== 0) {
                const camDist = Math.hypot(pe[12] - ce[12], pe[13] - ce[13], pe[14] - ce[14]);
            }
        }
        return true;
    }
    function getThreePlayerTransform() {
        const activeCam = getActiveRaceCamera();
        if (!isValidRaceCar(playerCar, activeCam)) {
            playerCar = findPlayerCar();
        }
        const target = playerCar;
        if (!target || !isValidRaceCar(target, activeCam)) return null;
        const e = target.matrixWorld.elements;
        const wx = e[12];
        const wz = e[14];
        if (!Number.isFinite(wx) || !Number.isFinite(wz)) return null;
        const forwardX = -e[8];
        const forwardZ = e[10];
        const headingDeg = (Math.atan2(forwardX, forwardZ) * 180) / Math.PI;
        return { x: wx, z: -wz, r: Number.isFinite(headingDeg) ? headingDeg : 0 };
    }
    function isInActiveRaceScene() {
        if (!gameScene || !cachedTrackData) return false;
        let topLevelGroups = 0;
        for (let i = 0; i < gameScene.children.length; i++) {
            const c = gameScene.children[i];
            if (!c) continue;
            if (c.name === 'menu_track') return false;
            if (c.isGroup) topLevelGroups++;
        }
        return topLevelGroups >= 2;
    }
    let lastSendTime = 0;
    let wasInRace = false;
    function updateLoop(now) {
        if (now - lastSendTime >= 33) {
            lastSendTime = now;
            const raceSceneActive = isInActiveRaceScene();
            const transform = raceSceneActive ? getThreePlayerTransform() : null;
            const inRace = Boolean(raceSceneActive && transform && playerCar);
            if (inRace && !wasInRace) {
                wasInRace = true;
                window.postMessage({ type: 'RACE_START' }, "*");
            } else if (!raceSceneActive && wasInRace) {
                wasInRace = false;
                playerCar = null;
                cachedTrackData = null;
                window.postMessage({ type: 'RACE_END' }, "*");
            }
            if (inRace) {
                window.postMessage({
                    type: 'UPDATE_POS',
                    x: transform.x,
                    z: transform.z,
                    r: transform.r
                }, "*");
            }
        }
        requestAnimationFrame(updateLoop);
    }
    requestAnimationFrame(updateLoop);
    window.addEventListener("message", (e) => {
        if (e.data.type === 'READY' && cachedTrackData) {
            window.postMessage({ type: 'TRACK_DATA', data: cachedTrackData }, "*");
        }
    });
    window.__ARROW_DEBUG__ = () => ({
        gameScene,
        childrenSummary: gameScene?.children.map((c, i) => ({
            index: i,
            type: c.type,
            name: c.name,
            pos: { x: c.position.x, y: c.position.y, z: c.position.z },
            worldPos: { x: c.matrixWorld.elements[12], y: c.matrixWorld.elements[13], z: c.matrixWorld.elements[14] },
            childCount: c.children.length
        })),
        playerCar,
        pos: getThreePlayerTransform()
    });
})();
