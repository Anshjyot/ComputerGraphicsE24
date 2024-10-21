window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(0, 0, 3), vec3(0, 0, 0), vec3(0, 1, 0));

    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    var uMtex = gl.getUniformLocation(program, "uMtex");
    var uCubeMap = gl.getUniformLocation(program, "uCubeMap");
    var uReflective = gl.getUniformLocation(program, "reflective");
    var uEyePos = gl.getUniformLocation(program, "eyePos");

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    var eyePosition = vec3(0, 0, 3);
    gl.uniform3fv(uEyePos, flatten(eyePosition));

    var texMatrix = mat4();
    texMatrix[0][0] = -1;
    texMatrix[1][1] = -1;
    gl.uniformMatrix4fv(uMtex, false, flatten(texMatrix));

    var sphereData = generateSphere(1.0, 64, 64);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    var flatVertices = flattenVec3(sphereData.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatVertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    var flatNormals = flattenVec3(sphereData.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatNormals, gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var normalMap = gl.createTexture();
    var normalImage = new Image();
    normalImage.onload = function() {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, normalImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    normalImage.src = '../../../assets/textures/normalmap.png';
    
    var uNormalMap = gl.getUniformLocation(program, "uNormalMap");
    gl.uniform1i(uNormalMap, 1);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    var flatTexCoords = flatten(sphereData.texCoords);
    gl.bufferData(gl.ARRAY_BUFFER, flatTexCoords, gl.STATIC_DRAW);
    
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
    
    var cubemap = [
        '../../../assets/textures/cm_left.png',
        '../../../assets/textures/cm_right.png',
        '../../../assets/textures/cm_top.png',
        '../../../assets/textures/cm_bottom.png',
        '../../../assets/textures/cm_back.png',
        '../../../assets/textures/cm_front.png'
    ];

    var cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);

    var faceTargets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];

    var loadedFaces = 0;
    cubemap.forEach(function(url, index) {
        var image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
            gl.texImage2D(faceTargets[index], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            loadedFaces++;
            if (loadedFaces === 6) {
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                render();
            }
        };
        image.src = url;
    });

    gl.uniform1i(uCubeMap, 0);

    var quadVertices = [
        -1, -1, 0.999, 1,
         1, -1, 0.999, 1,
         1,  1, 0.999, 1,
        -1,  1, 0.999, 1
    ];

    var vQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);

    function renderQuad() {
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, vQuadBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        
        gl.disableVertexAttribArray(vNormal);
        gl.disableVertexAttribArray(vTexCoord);
    
        gl.uniform1f(uReflective, 0.0);
    
        var identityMatrix = mat4();
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(identityMatrix));
    
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.depthMask(true);
    }
    
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        renderQuad();
    
        var modelViewMatrix = viewMatrix;
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
    
        gl.uniform1f(uReflective, 1.0);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);
    
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalMap);
    
        gl.drawArrays(gl.TRIANGLES, 0, sphereData.vertices.length);
    
        requestAnimationFrame(render);
    }

    function generateSphere(radius, rows, columns) {
        var vertices = [];
        var normals = [];
        var texCoords = [];
    
        for (var lat = 0; lat <= rows; ++lat) {
            var theta = lat * Math.PI / rows;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
    
            for (var long = 0; long <= columns; ++long) {
                var phi = long * 2 * Math.PI / columns;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);
    
                var x = cosPhi * sinTheta;
                var y = cosTheta;
                var z = sinPhi * sinTheta;
    
                normals.push(vec3(x, y, z));
                vertices.push(vec3(radius * x, radius * y, radius * z));

                var u = 1 - (long / columns);
                var v = 1 - (lat / rows);
                texCoords.push(vec2(u, v)); 
            }
        }
    
        var sphereVertices = [], sphereNormals = [], sphereTexCoords = [];
        for (var lat = 0; lat < rows; ++lat) {
            for (var long = 0; long < columns; ++long) {
                var first = (lat * (columns + 1)) + long;
                var second = first + columns + 1;
                sphereVertices.push(vertices[first], vertices[second], vertices[first + 1]);
                sphereNormals.push(normals[first], normals[second], normals[first + 1]);
                sphereVertices.push(vertices[second], vertices[second + 1], vertices[first + 1]);
                sphereNormals.push(normals[second], normals[second + 1], normals[first + 1]);
    
                sphereTexCoords.push(texCoords[first], texCoords[second], texCoords[first + 1]);  
                sphereTexCoords.push(texCoords[second], texCoords[second + 1], texCoords[first + 1]);
            }
        }
        return {
            vertices: sphereVertices,
            normals: sphereNormals,
            texCoords: sphereTexCoords  
        };
    }

    function flattenVec3(arr) {
        var flat = [];
        for (var i = 0; i < arr.length; i++) {
            flat.push(arr[i][0], arr[i][1], arr[i][2]);
        }
        return new Float32Array(flat);
    }
};
