window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var groundVertices = new Float32Array([
        -2, -1, -1,
         2, -1, -1,
         2, -1, -5,
        -2, -1, -5
    ]);

    var groundTexCoords = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
    ]);

    var redQuadVertices = new Float32Array([
        0.25, -0.5, -1.25,
        0.75, -0.5, -1.25,
        0.75, -0.5, -1.75,
        0.25, -0.5, -1.75,
        -1, -1, -2.5,
        -1,  0, -2.5,
        -1,  0, -3,
        -1, -1, -3
    ]);

    var vBufferGround = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferGround);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var tBufferGround = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBufferGround);
    gl.bufferData(gl.ARRAY_BUFFER, groundTexCoords, gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");

    var groundTexture = gl.createTexture();
    var groundImage = new Image();
    groundImage.onload = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, groundImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        render();
    };
    groundImage.src = '../../../assets/xamp23.png';

    var redTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    var redColor = new Uint8Array([255, 0, 0, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redColor);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    var vBufferRedQuads = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferRedQuads);
    gl.bufferData(gl.ARRAY_BUFFER, redQuadVertices, gl.STATIC_DRAW);

    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");

    var modelViewMatrix = mat4();
    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBufferGround);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, tBufferGround);
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBufferRedQuads);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        gl.disableVertexAttribArray(vTexCoord);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, redTexture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 1);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
    }
};
