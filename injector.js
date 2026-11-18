(function() {
    const orgFetch = window.fetch;
    let cachedTrackData = null;
    let topGhostUserIds = new Set();
    const allScenes = new Set();
    let gameScene = null;
    let gameCamera = null;
    let playerCar = null;
    const prevPositions = new WeakMap();
    const captureThreeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.isScene && !allScenes.has(obj)) {
            allScenes.add(obj);
            if (!gameScene) gameScene = obj;
            console.log("[DashMap] Scene captured! Total scenes:", allScenes.size);
        }
        if (obj.isPerspectiveCamera && !gameCamera) {
            gameCamera = obj;
            console.log("[DashMap] Camera captured!");
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
                    cachedTrackData = data;
                    playerCar = null;
                    topGhostUserIds.clear();
                    window.postMessage({ type: 'TRACK_DATA', data }, "*");
                } 
                else if (Array.isArray(data) && data.length > 0 && data[0]?.userId && typeof data[0]?.time === "number") {
                    topGhostUserIds = new Set(data.slice(0, 3).map(entry => entry.userId));
                }
                else if (data && Array.isArray(data.snapshots)) {
                    if (topGhostUserIds.size > 0 && !topGhostUserIds.has(data.userId)) {
                        return;
                    }
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

   function findPlayerCar() {
        if (allScenes.size === 0) return null;

        let movingCandidate = null;
        let maxMoved = 0.002;

        for (const scene of allScenes) {
            scene.traverse((obj) => {
                if (!obj.parent || obj.isScene || obj.isCamera || obj.isLight) return;

                const e = obj.matrixWorld.elements;
                const wx = e[12], wy = e[13], wz = e[14];

                const prev = prevPositions.get(obj);
                prevPositions.set(obj, { x: wx, y: wy, z: wz });

                if (!prev) return;
                const moved = Math.hypot(wx - prev.x, wy - prev.y, wz - prev.z);

                if (moved > maxMoved) {
                    let rootObj = obj;
                    while (rootObj.parent && rootObj.parent !== scene) {
                        if (rootObj.parent.children.length > 5 &&
                            rootObj.parent.position.x === 0 &&
                            rootObj.parent.position.z === 0) {
                            break;
                        }
                        rootObj = rootObj.parent;
                    }
                    maxMoved = moved;
                    movingCandidate = rootObj;
                    gameScene = scene;
                }
            });
        }

        return movingCandidate;
    }
    function getThreePlayerTransform() {
        if (!playerCar || !playerCar.parent) {
            playerCar = findPlayerCar();
        }
        const target = playerCar;
        if (!target) return null;

        const e = target.matrixWorld.elements;
        const wx = e[12];
        const wz = e[14];

        const forwardX = -e[8];
        const forwardZ = e[10];
        const headingDeg = (Math.atan2(forwardX, forwardZ) * 180) / Math.PI;

        return { x: wx, z: -wz, r: headingDeg };
    }
    function updateLoop() {
        const transform = getThreePlayerTransform();
        if (transform) {
            window.postMessage({
                type: 'UPDATE_POS',
                x: transform.x,
                z: transform.z,
                r: transform.r
            }, "*");
        }
        requestAnimationFrame(updateLoop);
    }
    requestAnimationFrame(updateLoop);

    window.addEventListener("message", (e) => {
        if (e.data.type === 'READY' && cachedTrackData) {
            window.postMessage({ type: 'TRACK_DATA', data: cachedTrackData }, "*");
        }
    });

    window.__DASH_DEBUG__ = () => ({
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
