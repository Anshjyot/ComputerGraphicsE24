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


    
    document.getElementById("clearColor").selectedIndex = 0;
    document.getElementById("pointColor").selectedIndex = 7;

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
    var currentPointColor = 7;
    var drawMode = 'POINTS';  

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var maxNumPoints = 1000;

    var vBuffer = gl.createBuffer();
    var cBuffer = gl.createBuffer();

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var initialColor = clearColors[currentClearColor];
    gl.clearColor(initialColor[0], initialColor[1], initialColor[2], initialColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var points = []; 
    var pointColorsList = [];

    var tempPoints = [];
    var triangles = [];   
    var triangleColors = [];
    var trianglePoints = [];  

    document.getElementById("clearCanvas").addEventListener("click", function() {
        var clearColorSelect = document.getElementById("clearColor");
        currentClearColor = clearColorSelect.selectedIndex;
        var clearColor = clearColors[currentClearColor];
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        points = [];
        pointColorsList = [];
        tempPoints = [];
        triangles = [];
        triangleColors = [];
        trianglePoints = [];
    });

    document.getElementById("drawPointsMode").addEventListener("click", function() {
        drawMode = 'POINTS';
        tempPoints = [];
    });

    document.getElementById("drawTrianglesMode").addEventListener("click", function() {
        drawMode = 'TRIANGLES';
        tempPoints = [];
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
        var color = pointColors[currentPointColor];

        if (drawMode === 'POINTS') {
            points.push(point);
            pointColorsList.push(color);
        } else if (drawMode === 'TRIANGLES') {
            trianglePoints.push({ point, color });

            if (trianglePoints.length === 1 || trianglePoints.length === 2) {
                tempPoints = [...trianglePoints]; 
            }

            if (trianglePoints.length === 3) {
                for (var i = 0; i < 3; i++) {
                    triangles.push(trianglePoints[i].point);
                    triangleColors.push(trianglePoints[i].color);
                }


                tempPoints = [];
                trianglePoints = [];  
            }
        }

        render();
    });

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (var i = 0; i < points.length; i++) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points[i]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointColorsList[i]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vColor);

            gl.drawArrays(gl.POINTS, 0, 1);
        }

        for (var i = 0; i < tempPoints.length; i++) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tempPoints[i].point), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tempPoints[i].color), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vColor);

            gl.drawArrays(gl.POINTS, 0, 1);
        }

        for (var i = 0; i < triangles.length; i += 3) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangles.slice(i, i + 3).flat()), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColors.slice(i, i + 3).flat()), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vColor);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
    }
};
