window.onload = function () {
    const canvas = document.getElementById("glCanvas");
    const gl = WebGLUtils.setupWebGL(canvas, { alpha: false, stencil: true });
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.STENCIL_TEST);

    // Load shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Projection and camera setup
    const fov = 65; 
    const aspect = canvas.width / canvas.height;
    const projMatrix = perspective(fov, aspect, 0.1, 100.0);

    const cameraPos = vec3(0, 0, 1);
    const target = vec3(0, 0, -3);
    const up = vec3(0, 1, 0);
    const cameraView = lookAt(cameraPos, target, up);

    let teapotModel;
    readOBJFile('../../../assets/Cup.obj', 0.5, false).then(function (model) {
        teapotModel = model;
        requestAnimationFrame(render);
    });

    const uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    const uNormalMatrix = gl.getUniformLocation(program, "uNormalMatrix");
    const uLightPosition = gl.getUniformLocation(program, "uLightPosition");

    const lightPos = vec3(3, 2.0, 3);

    const R = reflectionMatrix();
    let time = 0;

    function render() {
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    
        gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projMatrix));
        gl.uniform3fv(uLightPosition, flatten(lightPos));
    
        const jumpHeight = Math.sin(time) * 0.5; 
        const teapotY = -1 + jumpHeight;
    
        const baseModel = mult(translate(0, teapotY, -3), scalem(0.25, 0.25, 0.25));
    
        // ***** Step 1: Draw the ground quad into the stencil buffer *****
        gl.colorMask(false, false, false, false); // Disable color writes
        gl.depthMask(false);                     // Disable depth writes
        gl.stencilFunc(gl.ALWAYS, 1, 0xFF);      // Stencil test always passes
        gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE); // Replace stencil buffer values
    
        drawGroundQuad();
    
        gl.colorMask(true, true, true, true); // Re-enable color writes
        gl.depthMask(true);                  // Re-enable depth writes
        gl.stencilFunc(gl.EQUAL, 1, 0xFF);   // Draw where stencil buffer equals 1
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); // Keep stencil values
    
        // ***** Step 2: Draw the reflected teapot with oblique clipping *****
        {
            // Define the reflection plane (y = 0 in eye space)
            const clipPlane = vec4(0, 1, 0, 0); // Plane equation: y = 0
    
            // Modify the projection matrix to align near plane with the reflection plane
            const reflectedProj = modifyProjectionMatrix(clipPlane, projMatrix);
    
            const reflectedMV = mult(cameraView, mult(R, baseModel));
            const reflectedNormalMatrix = normalMatrixFromMV(reflectedMV);
    
            gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(reflectedProj));
            gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(reflectedMV));
            gl.uniformMatrix4fv(uNormalMatrix, false, flatten(reflectedNormalMatrix));
    
            drawModel(teapotModel);
        }
    
        // Reset the original projection matrix
        gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projMatrix));
    
        // Disable stencil test for remaining objects
        gl.disable(gl.STENCIL_TEST);
    
        // ***** Step 3: Draw the ground quad with transparency *****
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
        drawGroundQuad();
    
        gl.disable(gl.BLEND);
    
        // ***** Step 4: Draw the original teapot *****
        {
            const mv = mult(cameraView, baseModel);
            const normalMatrix = normalMatrixFromMV(mv);
    
            gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(mv));
            gl.uniformMatrix4fv(uNormalMatrix, false, flatten(normalMatrix));
    
            drawModel(teapotModel);
        }
    
        time += 0.03;
        requestAnimationFrame(render);
    }
    
    function modifyProjectionMatrix(clipPlane, projection) {
        // Construct the clip plane in eye space
        const oblique = mult(mat4(), projection);
        const q = vec4(
            (Math.sign(clipPlane[0]) + projection[8]) / projection[0],
            (Math.sign(clipPlane[1]) + projection[9]) / projection[5],
            -1.0,
            (1.0 + projection[10]) / projection[14]
        );
    
        const s = 2.0 / dot(clipPlane, q);
        oblique[2] = vec4(
            clipPlane[0] * s,
            clipPlane[1] * s,
            clipPlane[2] * s + 1.0,
            clipPlane[3] * s
        );
    
        return oblique;
    }

    
    function drawGroundQuad() {
        const vertices = new Float32Array([
            -1, -1, -1, 1,
             1, -1, -1, 1,
             1, -1,  1, 1,
            -1, -1,  1, 1
        ]);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        const iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.uniform4f(gl.getUniformLocation(program, "uColor"), 0.6, 0.6, 0.6, 0.5);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function drawModel(model) {
        if (!model) return;

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
        const vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        const iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function normalMatrixFromMV(modelViewMatrix) {
        // Extract the upper-left 3x3 portion of the model-view matrix
        const mat3x3 = [
            modelViewMatrix[0], modelViewMatrix[1], modelViewMatrix[2],
            modelViewMatrix[4], modelViewMatrix[5], modelViewMatrix[6],
            modelViewMatrix[8], modelViewMatrix[9], modelViewMatrix[10]
        ];
    
        // Compute the inverse of the 3x3 matrix
        const invMat3x3 = inverse3x3(mat3x3);
    
        // Transpose the inverted matrix
        const normalMatrix = transpose3x3(invMat3x3);
    
        return mat4(
            normalMatrix[0], normalMatrix[1], normalMatrix[2], 0,
            normalMatrix[3], normalMatrix[4], normalMatrix[5], 0,
            normalMatrix[6], normalMatrix[7], normalMatrix[8], 0,
            0, 0, 0, 1
        );
    }
    
    function inverse3x3(m) {
        const a = m[0], b = m[1], c = m[2];
        const d = m[3], e = m[4], f = m[5];
        const g = m[6], h = m[7], i = m[8];
    
        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    
        if (det === 0) return mat3();
    
        const invDet = 1 / det;
    
        return [
            (e * i - f * h) * invDet,
            (c * h - b * i) * invDet,
            (b * f - c * e) * invDet,
            (f * g - d * i) * invDet,
            (a * i - c * g) * invDet,
            (c * d - a * f) * invDet,
            (d * h - e * g) * invDet,
            (b * g - a * h) * invDet,
            (a * e - b * d) * invDet
        ];
    }
    
    function transpose3x3(m) {
        return [
            m[0], m[3], m[6],
            m[1], m[4], m[7],
            m[2], m[5], m[8]
        ];
    }
    

    function reflectionMatrix() {
        let R = mat4();
        R = mult(translate(0, -1, 0), R);
        R = mult(scalem(1, -1, 1), R);
        R = mult(translate(0, 1, 0), R);
        return R;
    }
};
