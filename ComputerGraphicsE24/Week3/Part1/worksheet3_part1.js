window.onload = function() {
    var canvas = document.getElementById("glCanvas");
    var gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0); 
    gl.enable(gl.DEPTH_TEST); 

    var vertices = [
        vec3(-0.5, -0.5,  0.5),
        vec3( 0.5, -0.5,  0.5),
        vec3( 0.5,  0.5,  0.5),
        vec3(-0.5,  0.5,  0.5),
        vec3(-0.5, -0.5, -0.5),
        vec3( 0.5, -0.5, -0.5),
        vec3( 0.5,  0.5, -0.5),
        vec3(-0.5,  0.5, -0.5)
    ];

    var indices = new Uint8Array([
        0, 1, 1, 2, 2, 3, 3, 0, 
        4, 5, 5, 6, 6, 7, 7, 4,  
        0, 4, 1, 5, 2, 6, 3, 7   
    ]);

 
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

 
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

 
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);


    var projMatrix = ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);


    var mvMatrix = mat4();
    mvMatrix = mult(mvMatrix, rotateX(35));
    mvMatrix = mult(mvMatrix, rotateY(45));


    var projLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    var mvLoc = gl.getUniformLocation(program, "uModelViewMatrix");

 
    gl.uniformMatrix4fv(projLoc, false, flatten(projMatrix));
    gl.uniformMatrix4fv(mvLoc, false, flatten(mvMatrix));


    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_BYTE, 0);
        requestAnimationFrame(render);
    }

    render();
};
