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

    var subdivisionLevel = 3;

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var va = vec4(0.0, 0.0, -1.0, 1);
    var vb = vec4(0.0, 0.942809, 0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
    var vd = vec4(0.816497, -0.471405, 0.333333, 1);

    var pointsArray = [];

    function triangle(a, b, c) {
        pointsArray.push(a);
        pointsArray.push(b);
        pointsArray.push(c);
    }

    function divideTriangle(a, b, c, count) {
        if (count > 0) {
            var ab = normalize(mix(a, b, 0.5), true);
            var ac = normalize(mix(a, c, 0.5), true);
            var bc = normalize(mix(b, c, 0.5), true);
            divideTriangle(a, ab, ac, count - 1);
            divideTriangle(ab, b, bc, count - 1);
            divideTriangle(bc, c, ac, count - 1);
            divideTriangle(ab, bc, ac, count - 1);
        } else {
            triangle(a, b, c);
        }
    }

    function tetrahedron(a, b, c, d, n) {
        divideTriangle(a, b, c, n);
        divideTriangle(d, c, b, n);
        divideTriangle(a, d, b, n);
        divideTriangle(a, c, d, n);
    }


    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

 
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);


    var projMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);


    var projLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    var mvLoc = gl.getUniformLocation(program, "uModelViewMatrix");

    gl.uniformMatrix4fv(projLoc, false, flatten(projMatrix));

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var mvMatrix = mat4();
        mvMatrix = mult(mvMatrix, translate(0.0, 0.0, -3.0)); 

        gl.uniformMatrix4fv(mvLoc, false, flatten(mvMatrix));

        pointsArray = [];
        tetrahedron(va, vb, vc, vd, subdivisionLevel);

        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

        gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);

        requestAnimationFrame(render);
    }


    document.getElementById("increaseSubdivision").onclick = function() {
        subdivisionLevel++;
    };

    document.getElementById("decreaseSubdivision").onclick = function() {
        if (subdivisionLevel > 0) {
            subdivisionLevel--;
        }
    };

    render();
};
