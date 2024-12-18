window.onload = function () {
    const canvas = document.getElementById("glCanvas");
    const gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) alert("WebGL isn't supported");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);

    
    const groundProgram = initShaders(gl, "ground-vertex-shader", "ground-fragment-shader");
    const teapotProgram = initShaders(gl, "teapot-vertex-shader", "teapot-fragment-shader");

   
    const projMatrix = perspective(60, canvas.width / canvas.height, 0.1, 100.0);

    const groundTexture = loadTexture(gl, "../../../assets/xamp23.png");


    let teapotModel;
    let lightAngle = 0, moveTeapot = true, orbitLight = true, teapotYOffset = 0;

    document.getElementById("toggleLight").onclick = () => orbitLight = !orbitLight;
    document.getElementById("toggleMotion").onclick = () => moveTeapot = !moveTeapot;

    readOBJFile('../../../assets/Cup.obj', 0.5, false).then(function (model) {
        teapotModel = model;
        requestAnimationFrame(render);
    });

    const uIsShadowLoc = gl.getUniformLocation(teapotProgram, "uIsShadow");
    const uLightPositionLoc = gl.getUniformLocation(teapotProgram, "uLightPosition");

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        lightAngle += orbitLight ? 0.01 : 0;
        const lightPos = vec3(3 * Math.sin(lightAngle), 2.0, 3 * Math.cos(lightAngle));
        teapotYOffset = moveTeapot ? 0.5 * Math.sin(performance.now() / 500) : 0;
        drawGround();
        drawTeapotShadow(lightPos);
        drawTeapot(lightPos);
        requestAnimationFrame(render);
    }
    

    function drawGround() {
        gl.useProgram(groundProgram);
        setMatrices(gl, groundProgram, translate(0, -1, -3), projMatrix);
        setTexture(gl, groundProgram, groundTexture);
        drawQuad(gl);
    }

    function drawTeapot(lightPos) {
        gl.useProgram(teapotProgram);
       
        gl.uniform1i(uIsShadowLoc, 0);

        const mvMatrix = mult(translate(0, teapotYOffset - 1, -3), scalem(0.25, 0.25, 0.25));
      
        setMatrices(gl, teapotProgram, mvMatrix, projMatrix);
        gl.uniform3fv(uLightPositionLoc, flatten(lightPos));
        drawModel(gl, teapotModel);
    }

    function drawTeapotShadow(lightPos) {
        gl.useProgram(teapotProgram);
    
       
        gl.uniform1i(uIsShadowLoc, 1); 
    
     
        const d = lightPos[1] + 1.0; 
        const Mp = mat4(
            vec4(1, 0, 0, 0),
            vec4(0, 0, 0, 0),
            vec4(0, 0, 1, 0),
            vec4(0, 1 / d, 0, 1)
        );
    
       
        const Tneg = translate(-lightPos[0], -lightPos[1], -lightPos[2]);
        const Tpos = translate(lightPos[0], lightPos[1], lightPos[2]);
        const shadowMatrix = mult(Tpos, mult(Mp, Tneg));
    
       
        const teapotModelMatrix = mult(
            translate(0, teapotYOffset - 1, -3),
            scalem(0.25, 0.25, 0.25)
        );
    

        const mvMatrix = mult(translate(0, teapotYOffset + 0.5, -3), scalem(0.25, 0.25, 0.25));

    
      
        setMatrices(gl, teapotProgram, mvMatrix, projMatrix);
    
        
        gl.depthFunc(gl.GREATER);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.0, 1.0);
    
  
        drawModel(gl, teapotModel);
    
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.depthFunc(gl.LESS);
    
    
        gl.uniform1i(uIsShadowLoc, 0);
    }
    

    function setMatrices(gl, program, modelViewMatrix, projectionMatrix) {
        const mvMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
        const projMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
        gl.uniformMatrix4fv(mvMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projMatrixLoc, false, flatten(projectionMatrix));
    }

    function setTexture(gl, program, texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
    }

    function drawQuad(gl) {
        const vertices = new Float32Array([
            -5, -1, -3,
             5, -1, -3,
             5, -1, -10,
            -5, -1, -10
        ]);

        
        const texCoords = new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);

        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const vPosition = gl.getAttribLocation(currentProgram, "vPosition");
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        const vTexCoord = gl.getAttribLocation(currentProgram, "vTexCoord");
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    function drawModel(gl, model) {
        if (!model) return;

        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
        const vPosition = gl.getAttribLocation(currentProgram, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        const nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
        const vNormal = gl.getAttribLocation(currentProgram, "vNormal");
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function loadTexture(gl, url) {
        const texture = gl.createTexture();
        const image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        };
        image.src = url;
        return texture;
    }
};