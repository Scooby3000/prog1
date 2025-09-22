(function() {
    class Color {
        constructor(r,g,b,a) {
            try {
                if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                    throw "color component not a number";
                else if ((r<0) || (g<0) || (b<0) || (a<0))
                    throw "color component less than 0";
                else if ((r>255) || (g>255) || (b>255) || (a>255))
                    throw "color component bigger than 255";
                else {
                    this.r = r; this.g = g; this.b = b; this.a = a;
                }
            } catch (e) {
                console.log(e);
            }
        }
        change(r,g,b,a) {
            try {
                if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                    throw "color component not a number";
                else if ((r<0) || (g<0) || (b<0) || (a<0))
                    throw "color component less than 0";
                else if ((r>255) || (g>255) || (b>255) || (a>255))
                    throw "color component bigger than 255";
                else {
                    this.r = r; this.g = g; this.b = b; this.a = a;
                }
            } catch (e) {
                console.log(e);
            }
        }
    }
  
    function drawPixel(imagedata,x,y,color) {
        try {
            if ((typeof(x) !== "number") || (typeof(y) !== "number"))
                throw "drawpixel location not a number";
            else if ((x<0) || (y<0) || (x>=imagedata.width) || (y>=imagedata.height))
                throw "drawpixel location outside of image";
            else if (color instanceof Color) {
                var pixelindex = (y*imagedata.width + x) * 4;
                imagedata.data[pixelindex] = color.r;
                imagedata.data[pixelindex+1] = color.g;
                imagedata.data[pixelindex+2] = color.b;
                imagedata.data[pixelindex+3] = color.a;
            } else throw "drawpixel color is not a Color";
        } catch (e) {
            console.log(e);
        }
    }
  
    function vec3(x,y,z) {return {x:x,y:y,z:z};}
    function vec3Add(a,b) {return {x:a.x+b.x, y:a.y+b.y, z:a.z+b.z};}
    function vec3Sub(a,b) {return {x:a.x-b.x, y:a.y-b.y, z:a.z-b.z};}
    function vec3Scale(a,s) {return {x:a.x*s, y:a.y*s, z:a.z*s};}
    function vec3Length(a) {return Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);}
    function vec3Normalize(a) {
        var len = vec3Length(a);
        return len > 0 ? vec3Scale(a, 1/len) : {x:0,y:0,z:0};
    }
    function vec3Dot(a,b) {return a.x*b.x + a.y*b.y + a.z*b.z;}
  
    function rayIntersectBox(rayOrigin, rayDir, box) {
        var tmin = -Infinity;
        var tmax = Infinity;
  
        var invDx = 1/rayDir.x;
        var tx1 = (box.min.x - rayOrigin.x)*invDx;
        var tx2 = (box.max.x - rayOrigin.x)*invDx;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
        if (tmax < tmin) return {hit:false};
  
        var invDy = 1/rayDir.y;
        var ty1 = (box.min.y - rayOrigin.y)*invDy;
        var ty2 = (box.max.y - rayOrigin.y)*invDy;
        tmin = Math.max(tmin, Math.min(ty1, ty2));
        tmax = Math.min(tmax, Math.max(ty1, ty2));
        if (tmax < tmin) return {hit:false};
  
        var invDz = 1/rayDir.z;
        var tz1 = (box.min.z - rayOrigin.z)*invDz;
        var tz2 = (box.max.z - rayOrigin.z)*invDz;
        tmin = Math.max(tmin, Math.min(tz1, tz2));
        tmax = Math.min(tmax, Math.max(tz1, tz2));
        if (tmax < tmin) return {hit:false};
  
        if (tmax < 0) return {hit:false};
  
        return {hit:true,tnear:tmin,tfar:tmax};
    }
  
    function getWorldCoords(x,y,w,h) {
        var wx = x/(w-1);
        var wy = 1 - y/(h-1); 
        return vec3(wx, wy, 0);
    }
  
    function getBoxNormal(point, boxMin, boxMax) {
        const EPSILON = 1e-3; 
        if (Math.abs(point.x - boxMin.x) < EPSILON) return vec3(-1,0,0);
        if (Math.abs(point.x - boxMax.x) < EPSILON) return vec3(1,0,0);
        if (Math.abs(point.y - boxMin.y) < EPSILON) return vec3(0,-1,0);
        if (Math.abs(point.y - boxMax.y) < EPSILON) return vec3(0,1,0);
        if (Math.abs(point.z - boxMin.z) < EPSILON) return vec3(0,0,-1);
        if (Math.abs(point.z - boxMax.z) < EPSILON) return vec3(0,0,1);
        return vec3(0,0,0);
    }
  
    function blinnPhongLighting(point, normal, viewPos, lightPos, materialDiffuse) {
        var ambientStrength = 0.15; 
        var specularStrength = 0.6;
        var shininess = 32;
  
        var ambient = {
            r: ambientStrength * materialDiffuse.r,
            g: ambientStrength * materialDiffuse.g,
            b: ambientStrength * materialDiffuse.b
        };
  
        var lightDir = vec3Normalize(vec3Sub(lightPos, point));
        var diff = Math.max(vec3Dot(normal, lightDir), 0.0);
        var diffuse = {
            r: diff * materialDiffuse.r,
            g: diff * materialDiffuse.g,
            b: diff * materialDiffuse.b
        };
  
        var viewDir = vec3Normalize(vec3Sub(viewPos, point));
        var halfDir = vec3Normalize(vec3Add(lightDir, viewDir));
        var specAngle = Math.max(vec3Dot(normal, halfDir),0.0);
        var spec = Math.pow(specAngle, shininess) * specularStrength;
        var specular = {r: spec, g: spec, b: spec};
  
        var r = Math.max(0, Math.min(ambient.r + diffuse.r + specular.r, 1));
        var g = Math.max(0, Math.min(ambient.g + diffuse.g + specular.g, 1));
        var b = Math.max(0, Math.min(ambient.b + diffuse.b + specular.b, 1));
        return {r,g,b};
    }
  
    function getInputBoxes() {
        const INPUT_BOXES_URL = "https://ncsucgclass.github.io/prog1/boxes.json";
        var httpReq = new XMLHttpRequest();
        httpReq.open("GET",INPUT_BOXES_URL,false);
        httpReq.send(null);
        var startTime = Date.now();
  
        while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
            if ((Date.now()-startTime) > 3000) break;
        }
  
        if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE)) {
            console.log("Unable to open input boxes file!");
            return String.null;
        } else return JSON.parse(httpReq.response);
    }
  
    function renderRayCastBoxesWithLighting(context) {
        var inputBoxes = getInputBoxes();
        if (inputBoxes == String.null) {
            console.log("Could not load boxes");
            return;
        }
        var w = context.canvas.width;
        var h = context.canvas.height;
        var imagedata = context.createImageData(w,h);
        var eye = vec3(0.5,0.5,-0.5);
        var lightPos = vec3(-0.5,1.5,-0.5);
  
        for(var y=0; y<h; y++) {
            for(var x=0; x<w; x++) {
                var pixelPos = getWorldCoords(x,y,w,h);
                var rayDir = vec3Normalize(vec3Sub(pixelPos, eye));
  
                var closestT = Infinity;
                var closestBox = null;
                for(var i=0; i<inputBoxes.length; i++) {
                    var box = inputBoxes[i];
                    var boxMin = vec3(box.lx, box.by, box.fz);
                    var boxMax = vec3(box.rx, box.ty, box.rz);
                    var res = rayIntersectBox(eye, rayDir, {min: boxMin, max: boxMax});
                    if(res.hit && res.tnear >= 0 && res.tnear < closestT) {
                        closestT = res.tnear;
                        closestBox = box;
                    }
                }
  
                if(closestBox != null) {
                    var intersection = vec3Add(eye, vec3Scale(rayDir, closestT));
                    var boxMin = vec3(closestBox.lx, closestBox.by, closestBox.fz);
                    var boxMax = vec3(closestBox.rx, closestBox.ty, closestBox.rz);
                    var normal = getBoxNormal(intersection, boxMin, boxMax);
  
                    var materialDiffuse = {
                        r: closestBox.diffuse[0],
                        g: closestBox.diffuse[1],
                        b: closestBox.diffuse[2]
                    };
  
                    var color = blinnPhongLighting(intersection, normal, eye, lightPos, materialDiffuse);
  
                    var c = new Color(
                        Math.round(color.r * 255),
                        Math.round(color.g * 255),
                        Math.round(color.b * 255),
                        255);
                    drawPixel(imagedata, x, y, c);
                } else {
                    var c = new Color(0,0,0,255);
                    drawPixel(imagedata, x, y, c);
                }
            }
        }
        context.putImageData(imagedata,0,0);
    }
  
    function main() {
        var canvas = document.getElementById("viewport");
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderRayCastBoxesWithLighting(context);
    }
    window.part2Main = main;
  })();
  