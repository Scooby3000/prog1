(function(){
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
            } else 
                throw "drawpixel color is not a Color";
        } catch(e) {
            console.log(e);
        }
    }
  
    function getWorldCoords(x, y, width, height) {
        var wx = x/(width-1);
        var wy = 1 - (y/(height-1)); 
        return {x: wx, y: wy, z: 0};
    }
  
    function vec3(x,y,z) { return {x:x, y:y, z:z}; }
    function vec3Sub(a,b) { return {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z}; }
    function vec3Normalize(a) {
        var len = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
        return len > 0 ? {x:a.x/len, y:a.y/len, z:a.z/len} : {x:0,y:0,z:0};
    }
  
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
  
        return {hit:true, tnear:tmin, tfar:tmax};
    }
  
    function getInputBoxes() {
        const INPUT_BOXES_URL = "https://ncsucgclass.github.io/prog1/boxes.json";
        var httpReq = new XMLHttpRequest();
        httpReq.open("GET",INPUT_BOXES_URL,false);
        httpReq.send(null);
        var startTime = Date.now();
  
        while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
            if ((Date.now()-startTime) > 3000)
                break;
        }
  
        if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE)) {
            console.log("Unable to open input boxes file!");
            return String.null;
        } else return JSON.parse(httpReq.response);
    }
  
    function renderRayCastBoxes(context) {
        var inputBoxes = getInputBoxes();
        if (inputBoxes == String.null) {
            console.log("Could not load boxes");
            return;
        }
        var w = context.canvas.width;
        var h = context.canvas.height;
        var imagedata = context.createImageData(w,h);
        var eye = vec3(0.5,0.5,-0.5);
  
        for(var y=0; y<h; y++) {
            for(var x=0; x<w; x++) {
                var pixelPos = getWorldCoords(x,y,w,h);
                var rayDir = vec3Sub(pixelPos, eye);
                rayDir = vec3Normalize(rayDir);
  
                var closestT = Infinity;
                var closestBox = null;
  
                for(var i=0;i<inputBoxes.length;i++) {
                    var box = inputBoxes[i];
                    var boxMin = vec3(box.lx, box.by, box.fz);
                    var boxMax = vec3(box.rx, box.ty, box.rz);
                    var result = rayIntersectBox(eye, rayDir, {min: boxMin, max: boxMax});
                    if(result.hit && result.tnear >= 0 && result.tnear < closestT) {
                        closestT = result.tnear;
                        closestBox = box;
                    }
                }
                if(closestBox != null) {
                    var c = new Color(
                        closestBox.diffuse[0]*255,
                        closestBox.diffuse[1]*255,
                        closestBox.diffuse[2]*255,
                        255);
                    drawPixel(imagedata,x,y,c);
                } else {
                    var c = new Color(0, 0, 0, 255);
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
        renderRayCastBoxes(context);
    }
    window.part1Main = main;
  })(); 
  