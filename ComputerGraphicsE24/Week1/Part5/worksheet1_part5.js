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

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var circleVertices = [];
    var numTriangles = 100; 
    var centerX = 0.0, centerY = 0.0, radius = 0.5;
    

    circleVertices.push(centerX, centerY);

    for (var i = 0; i <= numTriangles; i++) {
        var angle = (i * 2 * Math.PI) / numTriangles;
        var x = centerX + radius * Math.cos(angle);
        var y = centerY + radius * Math.sin(angle);
        circleVertices.push(x, y);
    }

    var vertices = new Float32Array(circleVertices);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var translation = 0.0;
    var direction = 1;
    var translationLocation = gl.getUniformLocation(program, "uTranslation");

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (translation > 0.5) direction = -1;
        else if (translation < -0.5) direction = 1;

        translation += direction * 0.01; 
        gl.uniform1f(translationLocation, translation);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, numTriangles + 2); 

        requestAnimationFrame(render); 
    }

    render();
};
