window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    // ---------------- Quaternion Class ----------------
    class Quaternion {
        constructor(w = 1, x = 0, y = 0, z = 0) {
            this.w = w;
            this.x = x;
            this.y = y;
            this.z = z;
        }

        make_rot_angle_axis(angle, axis) {
            var halfAngle = angle / 2;
            var sinHalfAngle = Math.sin(halfAngle);
            this.w = Math.cos(halfAngle);
            this.x = axis[0] * sinHalfAngle;
            this.y = axis[1] * sinHalfAngle;
            this.z = axis[2] * sinHalfAngle;
            return this;
        }

        multiply(q) {
            var w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
            var x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
            var y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;
            var z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;
            this.w = w;
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }

        normalize() {
            var len = Math.sqrt(this.w*this.w + this.x*this.x + this.y*this.y + this.z*this.z);
            if (len > 0.000001) {
                this.w /= len;
                this.x /= len;
                this.y /= len;
                this.z /= len;
            }
            return this;
        }

        get_mat4() {
            var ww = this.w * this.w;
            var xx = this.x * this.x;
            var yy = this.y * this.y;
            var zz = this.z * this.z;

            var wx = this.w * this.x;
            var wy = this.w * this.y;
            var wz = this.w * this.z;

            var xy = this.x * this.y;
            var xz = this.x * this.z;
            var yz = this.y * this.z;

            return [
                1 - 2 * (yy + zz),  2 * (xy - wz),      2 * (xz + wy),      0,
                2 * (xy + wz),      1 - 2 * (xx + zz),  2 * (yz - wx),      0,
                2 * (xz - wy),      2 * (yz + wx),      1 - 2 * (xx + yy), 0,
                0,                  0,                  0,                  1
            ];
        }
    }
    // ---------------------------------------------------

    // ---------------- Vector Utilities ----------------
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

    function normalizeVector(v) {
        var length = vec3Length(v);
        if (length > 0.000001) {
            return [v[0] / length, v[1] / length, v[2] / length];
        } else {
            return [0, 0, 0];
        }
    }

    // ---------------------------------------------------

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

    // Vertex Buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    var flatVertices = flattenVec3(sphereData.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatVertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Normal Buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    var flatNormals = flattenVec3(sphereData.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatNormals, gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Projection Matrix
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    // Lighting Uniforms
    var uLightDirection = gl.getUniformLocation(program, "uLightDirection");
    gl.uniform3fv(uLightDirection, vec3(1.0, 1.0, -1.0));

    var uAmbientLight = gl.getUniformLocation(program, "uAmbientLight");
    gl.uniform3fv(uAmbientLight, vec3(0.5, 0.5, 0.5));

    var uDiffuseLight = gl.getUniformLocation(program, "uDiffuseLight");
    gl.uniform3fv(uDiffuseLight, vec3(0.9, 0.9, 0.9));

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Texture Setup
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

    // Interaction Modes
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

    // Camera Parameters
    var eyeDistance = 3.0;
    var lookAtDisplacement = vec3(0.0, 0.0, 0.0);
    var currentQuaternion = new Quaternion();
    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

    var isMouseDown = false;
    var lastMouseX = 0;
    var lastMouseY = 0;

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
            mouseX *= radius / Math.sqrt(length);
            mouseY *= radius / Math.sqrt(length);
        }
        return normalizeVector([mouseX, mouseY, z]);
    }
    

    // Mouse Event Handlers
    canvas.addEventListener('mousedown', function(event) {
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mouseup', function() {
        isMouseDown = false;
    });

    canvas.addEventListener('mouseleave', function() {
        isMouseDown = false;
    });

    canvas.addEventListener('mousemove', function(event) {
        if (!isMouseDown) return;

        var currentMouseX = event.clientX;
        var currentMouseY = event.clientY;

        var deltaX = currentMouseX - lastMouseX;
        var deltaY = currentMouseY - lastMouseY;

        lastMouseX = currentMouseX;
        lastMouseY = currentMouseY;

        switch(currentMode) {
            case InteractionMode.ORBIT:
                // Sensitivity factor
                var orbitSensitivity = 0.005;
                var angleX = deltaY * orbitSensitivity;
                var angleY = deltaX * orbitSensitivity;

                // Create quaternions for rotations around the camera's right and up vectors
                var rotationQuatX = new Quaternion().make_rot_angle_axis(angleX, [1, 0, 0]);
                var rotationQuatY = new Quaternion().make_rot_angle_axis(angleY, [0, 1, 0]);

                // Apply rotations
                currentQuaternion.multiply(rotationQuatX);
                currentQuaternion.multiply(rotationQuatY);
                currentQuaternion.normalize();
                break;

            case InteractionMode.DOLLY:
                // Sensitivity factor
                var dollySensitivity = 0.01;
                eyeDistance += deltaY * dollySensitivity;
                eyeDistance = Math.max(1.0, Math.min(20.0, eyeDistance));
                break;

            case InteractionMode.PAN:
                // Sensitivity factor
                var panSensitivity = 0.005 * eyeDistance;

                // Get rotation matrix from quaternion
                var rotationMatrix = currentQuaternion.get_mat4();

                // Extract right and up vectors from the rotation matrix
                var right = normalizeVector([rotationMatrix[0], rotationMatrix[1], rotationMatrix[2]]);
                var up = normalizeVector([rotationMatrix[4], rotationMatrix[5], rotationMatrix[6]]);

                // Update lookAtDisplacement based on mouse movement
                lookAtDisplacement = [
                    lookAtDisplacement[0] - deltaX * panSensitivity * right[0] - deltaY * panSensitivity * up[0],
                    lookAtDisplacement[1] - deltaX * panSensitivity * right[1] - deltaY * panSensitivity * up[1],
                    lookAtDisplacement[2] - deltaX * panSensitivity * right[2] - deltaY * panSensitivity * up[2]
                ];
                break;
        }
    });

    // Render Loop
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Get rotation matrix from quaternion
        var rotationMatrix = currentQuaternion.get_mat4();

        // Calculate eye direction
        var eyeDirection = [
            rotationMatrix[0] * 0 + rotationMatrix[4] * 0 + rotationMatrix[8] * eyeDistance,
            rotationMatrix[1] * 0 + rotationMatrix[5] * 0 + rotationMatrix[9] * eyeDistance,
            rotationMatrix[2] * 0 + rotationMatrix[6] * 0 + rotationMatrix[10] * eyeDistance
        ];

        // Calculate eye position
        var eyePosition = [
            lookAtDisplacement[0] + eyeDirection[0],
            lookAtDisplacement[1] + eyeDirection[1],
            lookAtDisplacement[2] + eyeDirection[2]
        ];

        // Calculate rotated up vector
        var rotatedUp = [
            rotationMatrix[4],
            rotationMatrix[5],
            rotationMatrix[6]
        ];
        var rotatedUpNormalized = normalizeVector(rotatedUp);
        if (vec3Length(rotatedUpNormalized) < 0.000001) {
            // Fallback if something is off
            rotatedUpNormalized = [0, 1, 0];
        }

        // Create view matrix
        var viewMatrix = lookAt(eyePosition, lookAtDisplacement, rotatedUpNormalized);
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(viewMatrix));

        // Draw the sphere
        gl.drawArrays(gl.TRIANGLES, 0, sphereData.vertices.length);
        requestAnimationFrame(render);
    }

    // Sphere Generation
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

                // First triangle
                sphereVertices.push(vertices[first]);
                sphereVertices.push(vertices[second]);
                sphereVertices.push(vertices[first + 1]);

                sphereNormals.push(normals[first]);
                sphereNormals.push(normals[second]);
                sphereNormals.push(normals[first + 1]);

                // Second triangle
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
