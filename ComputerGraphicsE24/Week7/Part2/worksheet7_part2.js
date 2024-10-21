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

    var projectionMatrix = perspective(60, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(0, 0, 3), vec3(0, 0, 0), vec3(0, 1, 0));

    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    var uMtex = gl.getUniformLocation(program, "uMtex");
    var texMatrix = mat4();
    texMatrix[0][0] = -1;
    gl.uniformMatrix4fv(uMtex, false, flatten(texMatrix));

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

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

    var uCubeMap = gl.getUniformLocation(program, "uCubeMap");
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

    var vIsBackground = gl.getAttribLocation(program, "vIsBackground");

    function renderQuad() {
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, vQuadBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttrib1f(vIsBackground, 2.0);
        var invProjectionMatrix = inverse(projectionMatrix);
        var viewRotationOnly = mat4(viewMatrix[0], viewMatrix[1], viewMatrix[2], vec4(0, 0, 0, 1));
        var invViewMatrix = inverse(viewRotationOnly);
        var texMatrix = mult(invViewMatrix, invProjectionMatrix);
        texMatrix[1][1] = -texMatrix[1][1];
        gl.uniformMatrix4fv(uMtex, false, flatten(texMatrix));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.depthMask(true);
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderQuad();
        var modelViewMatrix = viewMatrix;
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttrib1f(vIsBackground, 0.0);
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);
        gl.drawArrays(gl.TRIANGLES, 0, sphereData.vertices.length);
        requestAnimationFrame(render);
    }

    function generateSphere(radius, rows, columns) {
        var vertices = [];
        var normals = [];
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
            }
        }
        var sphereVertices = [], sphereNormals = [];
        for (var lat = 0; lat < rows; ++lat) {
            for (var long = 0; long < columns; ++long) {
                var first = (lat * (columns + 1)) + long;
                var second = first + columns + 1;
                sphereVertices.push(vertices[first], vertices[second], vertices[first + 1]);
                sphereNormals.push(normals[first], normals[second], normals[first + 1]);
                sphereVertices.push(vertices[second], vertices[second + 1], vertices[first + 1]);
                sphereNormals.push(normals[second], normals[second + 1], normals[first + 1]);
            }
        }
        return {
            vertices: sphereVertices,
            normals: sphereNormals
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
