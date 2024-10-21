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

    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(0, 0, 3), vec3(0, 0, 0), vec3(0, 1, 0));

    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
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

    var isMouseDown = false;
    var lastMousePos = null;
    var currentQuaternion = new Quaternion();

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
        return vec3(mouseX, mouseY, z);
    }

    canvas.addEventListener('mousedown', function(event) {
        isMouseDown = true;
        lastMousePos = getMouseProjection(event.clientX, event.clientY);
    });

    canvas.addEventListener('mouseup', function() {
        isMouseDown = false;
    });
    canvas.addEventListener('mousemove', function(event) {
        if (!isMouseDown) return;
        var newMousePos = getMouseProjection(event.clientX, event.clientY);
        if (lastMousePos) {
            var axis = vec3Cross(lastMousePos, newMousePos);
            var dotProduct = vec3Dot(lastMousePos, newMousePos) / (vec3Length(lastMousePos) * vec3Length(newMousePos));
            dotProduct = Math.max(-1, Math.min(1, dotProduct));
            var angle = Math.acos(dotProduct);
            if (vec3Length(axis) > 0.0001) {
                var rotationQuat = new Quaternion().make_rot_angle_axis(angle, axis);
                currentQuaternion.multiply(rotationQuat);
                currentQuaternion = currentQuaternion.normalize();
            }
            lastMousePos = newMousePos;
        }
    });

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        var rotationMatrix = currentQuaternion.get_mat4();
        var modelViewMatrix = mult(viewMatrix, rotationMatrix);
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
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
};
