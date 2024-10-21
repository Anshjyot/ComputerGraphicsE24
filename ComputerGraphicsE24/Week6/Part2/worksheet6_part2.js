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


    var vertices = new Float32Array([
        -4, -1, -1, 
         4, -1, -1,  
         4, -1, -21, 
        -4, -1, -21  
    ]);

 
    var texCoords = new Float32Array([
        -1.5,  0.0, 
         2.5,  0.0, 
         2.5, 10.0, 
        -1.5, 10.0  
    ]);


    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

   
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var checkerboard = new Uint8Array(64 * 64 * 4);
    for (var i = 0; i < 64; i++) {
        for (var j = 0; j < 64; j++) {
            var index = (i * 64 + j) * 4;
            var color = ((i & 8) == (j & 8)) ? 255 : 0;
            checkerboard[index] = checkerboard[index + 1] = checkerboard[index + 2] = color;
            checkerboard[index + 3] = 255;
        }
    }


    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, checkerboard);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


    var uTexture = gl.getUniformLocation(program, "uTexture");
    gl.uniform1i(uTexture, 0);

 
    var modelViewMatrix = mat4();
    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));

   
    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 100.0);
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    document.getElementById("wrapMode").onchange = function(event) {
        var wrapMode = event.target.value === "REPEAT" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
        render();
    };

    document.getElementById("filterMode").onchange = function(event) {
        var filterMode;
        switch (event.target.value) {
            case "NEAREST":
                filterMode = gl.NEAREST;
                break;
            case "LINEAR":
                filterMode = gl.LINEAR;
                break;
            case "NEAREST_MIPMAP_NEAREST":
                filterMode = gl.NEAREST_MIPMAP_NEAREST;
                break;
            case "LINEAR_MIPMAP_NEAREST":
                filterMode = gl.LINEAR_MIPMAP_NEAREST;
                break;
            case "NEAREST_MIPMAP_LINEAR":
                filterMode = gl.NEAREST_MIPMAP_LINEAR;
                break;
            case "LINEAR_MIPMAP_LINEAR":
                filterMode = gl.LINEAR_MIPMAP_LINEAR;
                break;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode);
        render();
    };


    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    render();
};
