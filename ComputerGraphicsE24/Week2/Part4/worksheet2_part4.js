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

    var currentClearColor = 0; // Default clear color index
    var currentPointColor = 7;
    var drawMode = 'POINTS';
    var firstCirclePoint = null;
    var firstCircleColor = null;
    var tempPoints = [];
    var points = [];
    var pointColorsList = [];
    var triangles = [];
    var triangleColors = [];
    var trianglePoints = [];

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    var cBuffer = gl.createBuffer();

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Always initialize with the background color
    var initialClearColor = clearColors[currentClearColor];
    gl.clearColor(initialClearColor[0], initialClearColor[1], initialClearColor[2], initialClearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Event Listeners (unchanged)
    document.getElementById("clearCanvas").addEventListener("click", function () {
        var clearColorSelect = document.getElementById("clearColor");
        currentClearColor = clearColorSelect.selectedIndex;
        var clearColor = clearColors[currentClearColor];
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        points = [];
        pointColorsList = [];
        triangles = [];
        triangleColors = [];
        tempPoints = [];
        trianglePoints = [];
        firstCirclePoint = null;
    });


    document.getElementById("drawPointsMode").addEventListener("click", function() {
        drawMode = 'POINTS';
        tempPoints = [];
        firstCirclePoint = null;
    });

    document.getElementById("drawTrianglesMode").addEventListener("click", function() {
        drawMode = 'TRIANGLES';
        tempPoints = [];
        firstCirclePoint = null;
    });

    document.getElementById("drawCircleMode").addEventListener("click", function() {
        drawMode = 'CIRCLE';
        tempPoints = [];
        firstCirclePoint = null; 
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
        } else if (drawMode === 'CIRCLE') {
            if (!firstCirclePoint) {
                firstCirclePoint = point;
                firstCircleColor = color;
                tempPoints = [{ point: firstCirclePoint, color: firstCircleColor }]; 
            } else {
                var edgeColor = color;
                drawCircle(firstCirclePoint, point, firstCircleColor, edgeColor);
                firstCirclePoint = null;
                tempPoints = []; 
            }
        }

        render();
    });

    function drawCircle(center, edge, centerColor, edgeColor) {
        var radius = Math.sqrt(Math.pow(edge[0] - center[0], 2) + Math.pow(edge[1] - center[1], 2));
        var numSegments = 100;
        var angleStep = (2 * Math.PI) / numSegments;
        var circleVertices = [];

        for (var i = 0; i < numSegments; i++) {
            var angle = i * angleStep;
            var x = center[0] + radius * Math.cos(angle);
            var y = center[1] + radius * Math.sin(angle);
            circleVertices.push([x, y]);
        }

        for (var i = 0; i < circleVertices.length; i++) {
            var nextIndex = (i + 1) % circleVertices.length;
            triangles.push(center, circleVertices[i], circleVertices[nextIndex]);

            triangleColors.push(centerColor, edgeColor, edgeColor);
        }
    }

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
