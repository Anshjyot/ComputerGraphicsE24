window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    function vec3Cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    function vec3Dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function vec3Length(v) {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    }

    function vec3(x, y, z) {
        return [x, y, z];
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var sphereData = generateSphere(1.0, 64, 64);

    function flattenVec3(arr) {
        var flat = [];
        for (var i = 0; i < arr.length; i++) {
            flat.push(arr[i][0], arr[i][1], arr[i][2]);
        }
        return new Float32Array(flat);
    }

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

    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    var uLightDirection = gl.getUniformLocation(program, "uLightDirection");
    gl.uniform3fv(uLightDirection, vec3(1.0, 1.0, -1.0));

    var uAmbientLight = gl.getUniformLocation(program, "uAmbientLight");
    gl.uniform3fv(uAmbientLight, vec3(0.5, 0.5, 0.5));

    var uDiffuseLight = gl.getUniformLocation(program, "uDiffuseLight");
    gl.uniform3fv(uDiffuseLight, vec3(0.9, 0.9, 0.9));

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    var texture = gl.createTexture();
    var image = new Image();
    image.src = "../../../assets/earth.jpg";
    image.onload = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        var ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) {
            var maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var uTexture = gl.getUniformLocation(program, "uTexture");
        gl.uniform1i(uTexture, 0);
        render();
    };

    var InteractionMode = {
        ORBIT: 'orbit',
        DOLLY: 'dolly',
        PAN: 'pan'
    };
    var currentMode = InteractionMode.ORBIT;

    var orbitBtn = document.getElementById('orbitBtn');
    var dollyBtn = document.getElementById('dollyBtn');
    var panBtn = document.getElementById('panBtn');

    function setActiveButton(button) {
        [orbitBtn, dollyBtn, panBtn].forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    orbitBtn.addEventListener('click', function() {
        currentMode = InteractionMode.ORBIT;
        setActiveButton(orbitBtn);
    });

    dollyBtn.addEventListener('click', function() {
        currentMode = InteractionMode.DOLLY;
        setActiveButton(dollyBtn);
    });

    panBtn.addEventListener('click', function() {
        currentMode = InteractionMode.PAN;
        setActiveButton(panBtn);
    });

    var eyeDistance = 3.0;
    var lookAtDisplacement = vec3(0.0, 0.0, 0.0);
    var currentQuaternion = new Quaternion();
    var viewMatrix = lookAt(vec3(0, 0, eyeDistance), vec3(0, 0, 0), vec3(0, 1, 0));
    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

    var isMouseDown = false;
    var lastMousePos = null;

    function getMouseProjection(x, y) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = (x - rect.left) / rect.width * 2 - 1;
        var mouseY = 1 - (y - rect.top) / rect.height * 2;
        var radius = 2;
        var length = mouseX * mouseX + mouseY * mouseY;
        var z = 0;
        if (length <= radius * radius) {
            z = Math.sqrt(radius * radius - length);
        } else {
            var norm = Math.sqrt(length);
            mouseX *= radius / norm;
            mouseY *= radius / norm;
        }
        return vec3(mouseX, mouseY, z);
    }
    
    canvas.addEventListener('mousedown', function(event) {
        isMouseDown = true;
        lastMousePos = getMouseProjection(event.clientX, event.clientY);
    });

    canvas.addEventListener('mouseup', function() {
        isMouseDown = false;
        lastMousePos = null;
    });

    canvas.addEventListener('mousemove', function(event) {
        if (!isMouseDown) return;
        var newMousePos = getMouseProjection(event.clientX, event.clientY);
        if (lastMousePos) {
            var deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            var deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
            switch(currentMode) {
                case InteractionMode.ORBIT:
                    var axis = vec3Cross(lastMousePos, newMousePos);
                    var dotProduct = vec3Dot(lastMousePos, newMousePos) / (vec3Length(lastMousePos) * vec3Length(newMousePos));
                    dotProduct = Math.max(-1, Math.min(1, dotProduct));
                    var angle = Math.acos(dotProduct);
                    if (vec3Length(axis) > 0.0001) {
                        var rotationQuat = new Quaternion().make_rot_angle_axis(angle, axis);
                        currentQuaternion.multiply(rotationQuat);
                        currentQuaternion.normalize();
                    }
                    break;
                case InteractionMode.DOLLY:
                    var dollySpeed = 0.01;
                    eyeDistance += deltaY * dollySpeed;
                    eyeDistance = Math.max(1.0, Math.min(20.0, eyeDistance));
                    break;
                case InteractionMode.PAN:
                    var panSpeed = 0.005 * eyeDistance;
                    var rotationMatrix = currentQuaternion.get_mat4();
                    var right = [rotationMatrix[0], rotationMatrix[1], rotationMatrix[2]];
                    var up = [rotationMatrix[4], rotationMatrix[5], rotationMatrix[6]];
                    right = normalizeVector(right);
                    up = normalizeVector(up);
                    if (!isValidVector(right) || !isValidVector(up)) {
                        currentQuaternion = new Quaternion();
                        break;
                    }
                    lookAtDisplacement = [
                        lookAtDisplacement[0] - deltaX * panSpeed * right[0] - deltaY * panSpeed * up[0],
                        lookAtDisplacement[1] - deltaX * panSpeed * right[1] - deltaY * panSpeed * up[1],
                        lookAtDisplacement[2] - deltaX * panSpeed * right[2] - deltaY * panSpeed * up[2]
                    ];
                    break;
            }
            lastMousePos = newMousePos;
        }
    });
    
    function normalizeVector(v) {
        var length = vec3Length(v);
        if (length > 0.0001) {
            return [v[0] / length, v[1] / length, v[2] / length];
        } else {
            return [0, 0, 0];
        }
    }
    
    function isValidVector(v) {
        return v.every(component => !isNaN(component) && isFinite(component));
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        var rotationMatrix = currentQuaternion.get_mat4();
        var eyeDirection = mult(rotationMatrix, vec4(0, 0, eyeDistance, 0));
        var eyePosition = [
            lookAtDisplacement[0] + eyeDirection[0],
            lookAtDisplacement[1] + eyeDirection[1],
            lookAtDisplacement[2] + eyeDirection[2]
        ];
        viewMatrix = lookAt(eyePosition, lookAtDisplacement, vec3(0, 1, 0));
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(viewMatrix));
        gl.drawArrays(gl.TRIANGLES, 0, sphereData.vertices.length);
        requestAnimationFrame(render);
    }
    
    function generateSphere(radius, rows, columns) {
        var vertices = [];
        var normals = [];

        for (var latNumber = 0; latNumber <= rows; ++latNumber) {
            var theta = latNumber * Math.PI / rows;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var longNumber = 0; longNumber <= columns; ++longNumber) {
                var phi = longNumber * 2 * Math.PI / columns;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = cosTheta;
                var z = sinPhi * sinTheta;

                normals.push(vec3(x, y, z));
                vertices.push(vec3(radius * x, radius * y, radius * z));
            }
        }

        var sphereVertices = [];
        var sphereNormals = [];

        for (var latNumber = 0; latNumber < rows; ++latNumber) {
            for (var longNumber = 0; longNumber < columns; ++longNumber) {
                var first = (latNumber * (columns + 1)) + longNumber;
                var second = first + columns + 1;

                sphereVertices.push(vertices[first]);
                sphereVertices.push(vertices[second]);
                sphereVertices.push(vertices[first + 1]);

                sphereNormals.push(normals[first]);
                sphereNormals.push(normals[second]);
                sphereNormals.push(normals[first + 1]);

                sphereVertices.push(vertices[second]);
                sphereVertices.push(vertices[second + 1]);
                sphereVertices.push(vertices[first + 1]);

                sphereNormals.push(normals[second]);
                sphereNormals.push(normals[second + 1]);
                sphereNormals.push(normals[first + 1]);
            }
        }

        return {
            vertices: sphereVertices,
            normals: sphereNormals
        };
    }
};
