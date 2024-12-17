window.onload = function () {
    const canvas = document.getElementById("glCanvas");
    const gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);

    // Load programs
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Projection and camera setup
    const fov = 65; // 65 degrees field of view
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

    // Light position
    const lightPos = vec3(3, 2.0, 3);

    // Reflection matrix about the plane y = -1
    // R = T(0,-1,0) * S(1,-1,1) * T(0,1,0)
    function reflectionMatrix() {
        let R = mat4();
        R = mult(translate(0, -1, 0), R);
        R = mult(scalem(1, -1, 1), R);
        R = mult(translate(0, 1, 0), R);
        return R;
    }

    const R = reflectionMatrix();

    let time = 0; // Animation time

    function render() {
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        // Set common uniforms
        gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projMatrix));
        gl.uniform3fv(uLightPosition, flatten(lightPos));
    
        // Calculate teapot jump animation (sinusoidal motion between y = -1 and y = 0)
        const jumpHeight = Math.sin(time) * 0.5; // Range [-0.5, 0.5]
        const teapotY = -1 + jumpHeight;
    
        // Base model matrix for the teapot
        const baseModel = mult(translate(0, teapotY, -3), scalem(0.25, 0.25, 0.25));
    
        // ***** Draw the reflected teapot *****
        {
            const reflectedMV = mult(cameraView, mult(R, baseModel));
            const reflectedNormalMatrix = normalMatrixFromMV(reflectedMV);
    
            gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(reflectedMV));
            gl.uniformMatrix4fv(uNormalMatrix, false, flatten(reflectedNormalMatrix));
            drawModel(gl, program, teapotModel);
        }
    
        // ***** Draw the ground quad with transparency *****
        {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
            const groundModel = mult(cameraView, scalem(5, 0.01, 5)); // Large ground quad at y = -1
            gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(groundModel));
            gl.uniformMatrix4fv(uNormalMatrix, false, flatten(mat4())); // No normal transformation needed
    
            drawGroundQuad(gl);
    
            gl.disable(gl.BLEND);
        }
    
        // ***** Draw the original teapot *****
        {
            const mv = mult(cameraView, baseModel);
            const normalMatrix = normalMatrixFromMV(mv);
    
            gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(mv));
            gl.uniformMatrix4fv(uNormalMatrix, false, flatten(normalMatrix));
            drawModel(gl, program, teapotModel);
        }
    
        time += 0.03; // Increment time for animation
        requestAnimationFrame(render);
    }
    

    function drawGroundQuad(gl) {
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
    
        gl.uniform4f(gl.getUniformLocation(program, "uColor"), 0.6, 0.6, 0.6, 0.5); // Partly transparent
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    
    function drawModel(gl, program, model) {
        if (!model) return;

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
        const vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        const nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
        const vNormal = gl.getAttribLocation(program, "vNormal");
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        const iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function normalMatrixFromMV(mv) {
        // Compute the normal matrix from the model-view matrix
        let upperLeft3x3 = mat3(
            vec3(mv[0][0], mv[0][1], mv[0][2]),
            vec3(mv[1][0], mv[1][1], mv[1][2]),
            vec3(mv[2][0], mv[2][1], mv[2][2])
        );
        upperLeft3x3 = inverse(upperLeft3x3);
        upperLeft3x3 = transpose(upperLeft3x3);

        // Convert back to mat4 form with last row and column for WebGL uniform
        let normalMat4 = mat4();
        normalMat4[0][0] = upperLeft3x3[0][0];
        normalMat4[0][1] = upperLeft3x3[0][1];
        normalMat4[0][2] = upperLeft3x3[0][2];
        normalMat4[1][0] = upperLeft3x3[1][0];
        normalMat4[1][1] = upperLeft3x3[1][1];
        normalMat4[1][2] = upperLeft3x3[1][2];
        normalMat4[2][0] = upperLeft3x3[2][0];
        normalMat4[2][1] = upperLeft3x3[2][1];
        normalMat4[2][2] = upperLeft3x3[2][2];
        return normalMat4;
    }
};
