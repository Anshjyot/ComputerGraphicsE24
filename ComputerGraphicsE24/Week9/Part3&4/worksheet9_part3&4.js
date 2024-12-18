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
    const shadowProgram = initShaders(gl, "shadow-vertex-shader", "shadow-fragment-shader");
    const groundProgram = initShaders(gl, "ground-vertex-shader", "ground-fragment-shader");
    const teapotProgram = initShaders(gl, "teapot-vertex-shader", "teapot-fragment-shader");

    const projMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    const groundTexture = loadTexture(gl, "../../../assets/xamp23.png");

    let teapotModel;
    let lightAngle = 0, moveTeapot = true, orbitLight = true, teapotYOffset = 0;

    readOBJFile('../../../assets/Cup.obj', 0.5, false).then(function (model) {
        teapotModel = model;
        requestAnimationFrame(render);
    });

    document.getElementById("toggleLight").onclick = () => orbitLight = !orbitLight;
    document.getElementById("toggleMotion").onclick = () => moveTeapot = !moveTeapot;

    // Framebuffer for shadow map
    const SHADOW_SIZE = 1024;
    const fbo = createFramebufferObject(gl, SHADOW_SIZE, SHADOW_SIZE);

    function createFramebufferObject(gl, width, height) {
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        const depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, depthTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER, depthBuffer);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return { fbo: framebuffer, texture: depthTexture, width: width, height: height };
    }

    function render() {
        gl.clearColor(0.9,0.9,0.9,1.0);

        lightAngle += orbitLight ? 0.01 : 0;
        teapotYOffset = moveTeapot ? 0.5 * Math.sin(performance.now() / 500) : 0;

        const lightPos = vec3(3 * Math.sin(lightAngle), 2.0, 3 * Math.cos(lightAngle));

        // Light view/projection
        const lightProjMatrix = perspective(90, 1.0, 0.1, 100.0);
        const lightViewMatrix = lookAt(lightPos, vec3(0,0,0), vec3(0,1,0));
        const lightVP = mult(lightProjMatrix, lightViewMatrix);

        // First Pass: Render to FBO from light's POV
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
        gl.viewport(0,0,fbo.width,fbo.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(shadowProgram);
        const uMvpMatrixShadow = gl.getUniformLocation(shadowProgram, "uMvpMatrix");
        // Draw ground for shadow
        {
            // ground model
            const groundMV = translate(0, -1, -3);
            const groundMVPFromLight = mult(lightVP, groundMV);
            gl.uniformMatrix4fv(uMvpMatrixShadow, false, flatten(groundMVPFromLight));
            drawQuadShadowPass();
        }

        // Draw teapot for shadow
        {
            const teapotMV = mult(translate(0, teapotYOffset - 1, -3), scalem(0.25,0.25,0.25));
            const teapotMVPFromLight = mult(lightVP, teapotMV);
            gl.uniformMatrix4fv(uMvpMatrixShadow, false, flatten(teapotMVPFromLight));
            drawModelShadowPass(teapotModel);
        }

        // Second Pass: Render to screen from camera POV
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const cameraView = lookAt(vec3(0,5,10), vec3(0,0,0), vec3(0,1,0));
        const cameraVP = mult(projMatrix, cameraView);

        // Draw ground with normal program
        gl.useProgram(groundProgram);
        const uModelViewMatrix_g = gl.getUniformLocation(groundProgram, "uModelViewMatrix");
        const uProjectionMatrix_g = gl.getUniformLocation(groundProgram, "uProjectionMatrix");
        const uMvpMatrixFromLight_g = gl.getUniformLocation(groundProgram,"uMvpMatrixFromLight");
        const uTexture_g = gl.getUniformLocation(groundProgram, "uTexture");
        const uShadowMap_g = gl.getUniformLocation(groundProgram, "uShadowMap");
        const uLightPos_g = gl.getUniformLocation(groundProgram, "uLightPosition");

        // Setup ground uniforms
        const groundMV = translate(0,-1,-3);
        const groundMVP = mult(cameraVP, groundMV);
        gl.uniformMatrix4fv(uModelViewMatrix_g, false, flatten(groundMV));
        gl.uniformMatrix4fv(uProjectionMatrix_g, false, flatten(projMatrix));
        gl.uniformMatrix4fv(uMvpMatrixFromLight_g, false, flatten(mult(lightVP, groundMV)));
        gl.uniform3fv(uLightPos_g, flatten(lightPos));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.uniform1i(uTexture_g,0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.uniform1i(uShadowMap_g,1);

        drawQuad(gl);

        // Draw teapot with normal program
        gl.useProgram(teapotProgram);
        const uModelViewMatrix_t = gl.getUniformLocation(teapotProgram,"uModelViewMatrix");
        const uProjectionMatrix_t = gl.getUniformLocation(teapotProgram,"uProjectionMatrix");
        const uMvpMatrixFromLight_t = gl.getUniformLocation(teapotProgram,"uMvpMatrixFromLight");
        const uShadowMap_t = gl.getUniformLocation(teapotProgram,"uShadowMap");
        const uLightPos_t = gl.getUniformLocation(teapotProgram,"uLightPosition");

        const teapotMV = mult(translate(0, teapotYOffset - 1, -3), scalem(0.25,0.25,0.25));
        gl.uniformMatrix4fv(uModelViewMatrix_t, false, flatten(teapotMV));
        gl.uniformMatrix4fv(uProjectionMatrix_t, false, flatten(projMatrix));
        gl.uniformMatrix4fv(uMvpMatrixFromLight_t, false, flatten(mult(lightVP, teapotMV)));
        gl.uniform3fv(uLightPos_t, flatten(lightPos));

        gl.activeTexture(gl.TEXTURE1); 
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.uniform1i(uShadowMap_t,1);

        drawModelNormalPass(teapotModel);

        requestAnimationFrame(render);
    }

    function drawQuadShadowPass() {
        // Just position attribute for shadow pass
        const vertices = new Float32Array([
            -2, -1, -2,
             2, -1, -2,
             2, -1, -6,
            -2, -1, -6
        ]);
        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(shadowProgram, "aPosition");
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false,0,0);
        gl.enableVertexAttribArray(aPosition);

        gl.drawArrays(gl.TRIANGLE_FAN,0,4);
    }

    function drawModelShadowPass(model) {
        if(!model) return;
        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(shadowProgram, "aPosition");
        gl.vertexAttribPointer(aPosition,4,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(aPosition);

        const iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT,0);
    }

    function drawQuad(gl) {
        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        const vertices = new Float32Array([
            -2, -1, -2,
             2, -1, -2,
             2, -1, -6,
            -2, -1, -6
        ]);
        const texCoords = new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const vPosition = gl.getAttribLocation(currentProgram, "vPosition");
        gl.vertexAttribPointer(vPosition,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(vPosition);

        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        const vTexCoord = gl.getAttribLocation(currentProgram,"vTexCoord");
        gl.vertexAttribPointer(vTexCoord,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(vTexCoord);

        gl.drawArrays(gl.TRIANGLE_FAN,0,4);
    }

    function drawModelNormalPass(model) {
        if(!model) return;
        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,model.vertices, gl.STATIC_DRAW);
        const vPosition = gl.getAttribLocation(currentProgram,"vPosition");
        gl.vertexAttribPointer(vPosition,4,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(vPosition);

        const nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,model.normals,gl.STATIC_DRAW);
        const vNormal = gl.getAttribLocation(currentProgram,"vNormal");
        gl.vertexAttribPointer(vNormal,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(vNormal);

        const iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,model.indices,gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT,0);
    }

    function loadTexture(gl, url) {
        const texture = gl.createTexture();
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        };
        image.src = url;
        return texture;
    }

};
