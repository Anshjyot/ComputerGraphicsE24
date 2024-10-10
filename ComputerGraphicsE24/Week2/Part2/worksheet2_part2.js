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


    var clearColors = [
        [0.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
        [0.0, 1.0, 0.0, 1.0],
        [0.0, 0.0, 1.0, 1.0],
        [1.0, 1.0, 0.0, 1.0],
        [1.0, 0.0, 1.0, 1.0],
        [0.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0] 
    ];

    var pointColors = [
        [0.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
        [0.0, 1.0, 0.0, 1.0],
        [0.0, 0.0, 1.0, 1.0],
        [1.0, 1.0, 0.0, 1.0],
        [1.0, 0.0, 1.0, 1.0],
        [0.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0] 
    ];

    var currentClearColor = 0;
    var currentPointColor = 0;

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var maxNumPoints = 1000;
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, maxNumPoints * 8, gl.STATIC_DRAW);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, maxNumPoints * 16, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var points = [];
    var colors = [];
    var index = 0;

    document.getElementById("clearCanvas").addEventListener("click", function() {
        var clearColorSelect = document.getElementById("clearColor");
        currentClearColor = clearColorSelect.selectedIndex;
        var clearColor = clearColors[currentClearColor];
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        points = [];
        colors = [];
        index = 0;
    });

    document.getElementById("pointColor").addEventListener("change", function() {
        currentPointColor = document.getElementById("pointColor").selectedIndex;
    });

    canvas.addEventListener("click", function(event) {
        var bbox = canvas.getBoundingClientRect();
        var mouseX = event.clientX - bbox.left;
        var mouseY = event.clientY - bbox.top;

        var clipX = -1 + 2 * mouseX / canvas.width;
        var clipY = -1 + 2 * (canvas.height - mouseY) / canvas.height;

        var point = [clipX, clipY];
        points.push(point);

        var color = pointColors[currentPointColor];
        colors.push(color);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(point));

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, new Float32Array(color));

        index++;

        render();
    });

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);

        gl.drawArrays(gl.POINTS, 0, points.length);
    }
};
