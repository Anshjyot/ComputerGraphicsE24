window.onload = function () {
    var canvas = document.getElementById("glCanvas");
    var gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vertices = new Float32Array([
        -0.5, 0.5,  
        -0.5, -0.5,  
        0.5, -0.5,   
        0.5, 0.5    
    ]);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var angle = 0.0;
    var uAngleLoc = gl.getUniformLocation(program, "u_Angle");

    function render() {
        angle += 0.02;
        gl.uniform1f(uAngleLoc, angle);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);  
        requestAnimFrame(render);
    }

    render();
};
