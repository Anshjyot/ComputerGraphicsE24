function initShaders(gl, vShaderId, fShaderId) {
    var vertShdr = document.getElementById(vShaderId).text;
    var fragShdr = document.getElementById(fShaderId).text;

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertShdr);
    gl.shaderSource(fragmentShader, fragShdr);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
}

window.onload = function () {
    var canvas = document.getElementById("glCanvas");
    var gl = WebGLUtils.setupWebGL(canvas);


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vertices = new Float32Array([
        0.0, 0.0,  
        1.0, 0.0,   
        1.0, 1.0    
    ]);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.drawArrays(gl.POINTS, 0, 3);
};
