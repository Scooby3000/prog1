(function() {
// Cached star field and animation frame ID
var _starFieldCache = null;
var _solarSystemAnimationId = null;
function vec3(x, y, z) { return { x, y, z }; }
function vec3Add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function vec3Sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function vec3Scale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
function vec3Dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function vec3Length(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }
function vec3Normalize(v) { let len = vec3Length(v); return len < 1e-8 ? vec3(0,0,0) : vec3Scale(v, 1/len); }

// Starfield generation and painting functions
function generateStarField(w, h, numStars) {
    let stars = new Array(numStars);
    for (let i = 0; i < numStars; i++) {
        stars[i] = {
            x: Math.floor(Math.random() * w),
            y: Math.floor(Math.random() * h),
            b: Math.floor(200 + Math.random() * 55),
            size: Math.random() < 0.12 ? 2 : 1
        };
    }
    return stars;
}

function paintStarsIntoImageData(imagedata, stars) {
    const w = imagedata.width, h = imagedata.height;
    for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        for (let dx = 0; dx < s.size; dx++) {
            for (let dy = 0; dy < s.size; dy++) {
                const x = s.x + dx;
                const y = s.y + dy;
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                const idx = (y * w + x) * 4;
                imagedata.data[idx] = s.b;
                imagedata.data[idx+1] = s.b;
                imagedata.data[idx+2] = s.b;
                imagedata.data[idx+3] = 255;
            }
        }
    }
}

// Intersection and shading helpers
function intersectSphere(sphere, o, d) {
    var oc = vec3Sub(o, vec3(sphere.x, sphere.y, sphere.z));
    var a = vec3Dot(d, d);
    var b = 2.0 * vec3Dot(oc, d);
    var c = vec3Dot(oc, oc) - sphere.r * sphere.r;
    var disc = b*b - 4*a*c;
    if (disc < 0) return {hit:false};
    var sqrtDisc = Math.sqrt(disc);
    var t0 = (-b - sqrtDisc) / (2*a);
    var t1 = (-b + sqrtDisc) / (2*a);
    var tNear = t0;
    if (tNear < 0) {
        tNear = t1;
        if (tNear < 0) return {hit:false};
    }
    var P = vec3Add(o, vec3Scale(d, tNear));
    var N = vec3Normalize(vec3Sub(P, vec3(sphere.x, sphere.y, sphere.z)));
    return {hit:true, tNear:tNear, point:P, normal:N};
}

function checkerTexture(N, scale = 30) {
    let theta = Math.atan2(N.y, N.x);
    let phi = Math.acos(Math.max(-1, Math.min(1, N.z)));
    let s = Math.floor(scale * (theta / (2 * Math.PI) + 0.5));
    let t = Math.floor(scale * (phi / Math.PI));
    return ((s + t) % 2 === 0) ? 1.0 : 0.3;
}

function computeSunVisibility(P, occluderSpheres, sunSphere) {
    const dirToSun = vec3Normalize(vec3Sub(vec3(sunSphere.x, sunSphere.y, sunSphere.z), P));
    const distToSunCenter = vec3Length(vec3Sub(vec3(sunSphere.x, sunSphere.y, sunSphere.z), P));
    const sunAng = Math.asin(Math.min(1, sunSphere.r / Math.max(1e-6, distToSunCenter)));
    let maxBlockedFraction = 0.0;
    for (let i = 0; i < occluderSpheres.length; i++) {
        const occ = occluderSpheres[i];
        const eps = 1e-4;
        const res = intersectSphere(occ, vec3Add(P, vec3Scale(dirToSun, eps)), dirToSun);
        if (!res.hit) continue;
        const distToOcc = res.tNear;
        if (distToOcc >= distToSunCenter - 1e-6) continue;
        const occAng = Math.asin(Math.min(1, occ.r / Math.max(1e-6, distToOcc)));
        const dirToOccCenter = vec3Normalize(vec3Sub(vec3(occ.x, occ.y, occ.z), P));
        const cosAngle = Math.max(-1, Math.min(1, vec3Dot(dirToSun, dirToOccCenter)));
        const centerAngle = Math.acos(cosAngle);
        if (centerAngle + sunAng <= occAng + 1e-6) {
            return {blockedFactor: 0.0};
        }
        if (centerAngle >= (sunAng + occAng)) {
            continue;
        }
        const overlapMetric = Math.max(0, 1 - (centerAngle - Math.abs(occAng - sunAng)) / (sunAng + occAng));
        const frac = Math.max(0, Math.min(1, overlapMetric));
        maxBlockedFraction = Math.max(maxBlockedFraction, frac);
    }
    return {blockedFactor: 1.0 - maxBlockedFraction};
}

// Main drawing function for Part 3 solar system
function drawPart3SolarSystem(context) {
    var w = context.canvas.width;
    var h = context.canvas.height;
    var imagedata = context.createImageData(w, h);

    const STAR_COUNT = 500;
    if (!_starFieldCache || _starFieldCache.w !== w || _starFieldCache.h !== h) {
        _starFieldCache = {w: w, h: h, stars: generateStarField(w, h, STAR_COUNT)};
    }
    paintStarsIntoImageData(imagedata, _starFieldCache.stars);

    const eye = vec3(0.5, 0.5, -0.5);
    const windowZ = 0.0;
    const lightPos = vec3(0.5, 0.5, 0.5);

    const Ia = [0.2, 0.2, 0.2]; // Ambient
    const Id = [1, 1, 1];       // Diffuse
    const Is = [1, 1, 1];       // Specular

    const sunEmission = 1.5;

    function loadSpheresJSON() {
        const spheresURL = "https://ncsucgclass.github.io/prog1/spheres.json";
        var httpReq = new XMLHttpRequest();
        httpReq.open("GET", spheresURL, false);
        httpReq.send(null);
        if (httpReq.status === 200) return JSON.parse(httpReq.responseText);
        else {
            console.log("Unable to load spheres.json; using default spheres.");
            return null;
        }
    }

    let loadedSpheres = loadSpheresJSON();

    let maxLoadedRadius = 0;
    if (loadedSpheres && loadedSpheres.length > 0) {
        for (let s of loadedSpheres) if (s.r > maxLoadedRadius) maxLoadedRadius = s.r;
    } else {
        loadedSpheres = [
            {x:0.5,y:0.5,z:0.5,r:0.3,ambient:[0.1,0.1,0.1],diffuse:[0.6,0.6,0.0],specular:[0.3,0.3,0.3],n:9},
            {x:0.75,y:0.75,z:0.5,r:0.15,ambient:[0.1,0.1,0.1],diffuse:[0.0,0.0,0.6],specular:[0.3,0.3,0.3],n:5},
            {x:0.75,y:0.25,z:0.5,r:0.2,ambient:[0.1,0.1,0.1],diffuse:[0.6,0.0,0.6],specular:[0.3,0.3,0.3],n:7}
        ];
        maxLoadedRadius = 0.3;
    }

    const desiredSunRadius = 0.08;
    const radiusScale = desiredSunRadius / maxLoadedRadius;
    loadedSpheres.sort((a,b) => b.r - a.r);

    const sun = Object.assign({}, loadedSpheres[0]);
    sun.r *= radiusScale;
    sun.ambient = sun.ambient || [0.3, 0.3, 0.0];
    sun.diffuse = sun.diffuse || [1.0, 1.0, 0.0];
    sun.specular = sun.specular || [1, 1, 0.5];
    sun.n = sun.n || 30;

    if (typeof drawPart3SolarSystem.time === 'undefined') drawPart3SolarSystem.time = 0;
    drawPart3SolarSystem.time += 0.02;

    let spheres = [sun];

    let planetOrbitData = loadedSpheres.slice(1).map(sp => ({sphere: Object.assign({}, sp)}));
    planetOrbitData.sort((a,b) => a.sphere.r - b.sphere.r);

    const minOrbitRadius = sun.r + 0.30;
    const orbitGap = 0.3;

    planetOrbitData.forEach((data, idx) => {
        data.sphere.r *= radiusScale;
        if (!data.sphere.ambient) data.sphere.ambient = [0.1, 0.1, 0.1];
        if (!data.sphere.diffuse) data.sphere.diffuse = [0.5, 0.5, 0.5];
        if (!data.sphere.specular) data.sphere.specular = [0.7, 0.7, 0.7];
        if (!data.sphere.n) data.sphere.n = 10;

        data.orbitRadius = minOrbitRadius + idx * orbitGap;
        data.orbitSpeed = 0.6 + idx * 0.2;

        const angle = drawPart3SolarSystem.time * data.orbitSpeed;
        data.sphere.x = sun.x + data.orbitRadius * Math.cos(angle);
        data.sphere.y = sun.y + data.orbitRadius * Math.sin(angle);

        spheres.push(data.sphere);
    });

    function setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        let idx = (y * w + x) * 4;
        imagedata.data[idx] = Math.min(255, Math.round(r));
        imagedata.data[idx+1] = Math.min(255, Math.round(g));
        imagedata.data[idx+2] = Math.min(255, Math.round(b));
        imagedata.data[idx+3] = a;
    }

    const bgColor = [0,0,0];

    for (let py=0; py<h; py++) {
        for (let px=0; px<w; px++) {
            let u = (px + 0.5) / w;
            let v = 1.0 - (py + 0.5) / h;
            let worldPoint = vec3(u, v, windowZ);
            let rayOrigin = eye;
            let rayDir = vec3Normalize(vec3Sub(worldPoint, eye));

            let nearestT = Infinity;
            let hitSphere = null;
            let hitInfo = null;

            for (let s=0; s<spheres.length; s++) {
                let res = intersectSphere(spheres[s], rayOrigin, rayDir);
                if (res.hit && res.tNear < nearestT) {
                    nearestT = res.tNear;
                    hitSphere = spheres[s];
                    hitInfo = res;
                }
            }

            if (hitSphere) {
                const P = hitInfo.point;
                let N = vec3Normalize(hitInfo.normal);

                const L = vec3Normalize(vec3Sub(lightPos, P));
                const V = vec3Normalize(vec3Sub(eye, P));
                const H = vec3Normalize(vec3Add(L, V));

                const ka = hitSphere.ambient;
                const kd = hitSphere.diffuse;
                const ks = hitSphere.specular;
                const n = hitSphere.n;

                const ambient = [ka[0]*Ia[0], ka[1]*Ia[1], ka[2]*Ia[2]];

                let NdotL = vec3Dot(N, L);

                const occluders = spheres.filter(s => s !== hitSphere && s !== sun);
                let visibility = {blockedFactor: 1.0};
                if (occluders.length > 0) visibility = computeSunVisibility(P, occluders, sun);

                let diffuse = [0,0,0], specular=[0,0,0];
                if (NdotL > 0) {
                    const vis = visibility.blockedFactor;
                    diffuse = [kd[0]*Id[0]*NdotL*vis, kd[1]*Id[1]*NdotL*vis, kd[2]*Id[2]*NdotL*vis];
                    let specAngle = Math.pow(Math.max(0, vec3Dot(N,H)), n);
                    specular = [ks[0]*Is[0]*specAngle*vis, ks[1]*Is[1]*specAngle*vis, ks[2]*Is[2]*specAngle*vis];
                }

                let texFactor = 1.0;
                if (hitSphere !== sun) texFactor = checkerTexture(N, 30);

                let emission = [0,0,0];
                if (hitSphere === sun) emission = kd.map(c => c*255*sunEmission);

                let col = [
                    (ambient[0]+diffuse[0]*texFactor+specular[0])*255 + emission[0],
                    (ambient[1]+diffuse[1]*texFactor+specular[1])*255 + emission[1],
                    (ambient[2]+diffuse[2]*texFactor+specular[2])*255 + emission[2]
                ];

                col = col.map(c => Math.min(255, Math.max(0, c)));

                setPixel(px, py, col[0], col[1], col[2], 255);
            } else {
                let idx = (py * w + px) * 4;
                const isStarPixel = imagedata.data[idx] !== 0 || imagedata.data[idx+1] !== 0 || imagedata.data[idx+2] !== 0;
                if (!isStarPixel) setPixel(px, py, bgColor[0], bgColor[1], bgColor[2], 255);
            }
        }
    }

    context.putImageData(imagedata, 0, 0);

    if (window.currentPartIndex === 3) {
        _solarSystemAnimationId = window.requestAnimationFrame(() => drawPart3SolarSystem(context));
    }
}

// Main function to be called to start the Part 3 solar system animation
function main() {
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        console.error("Canvas element with id 'viewport' not found.");
        return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
        console.error("2D context not available on canvas.");
        return;
    }
    window.currentPartIndex = 3; // Set to part 3 to enable animation
    drawPart3SolarSystem(context);
}

// Function to stop the animation
function stop() {
    if (_solarSystemAnimationId) {
        window.cancelAnimationFrame(_solarSystemAnimationId);
        _solarSystemAnimationId = null;
    }
    window.currentPartIndex = null;
}

// Export the main and stop functions to global window object
window.part3Main = main;
window.part3Stop = stop;
  })(); 
