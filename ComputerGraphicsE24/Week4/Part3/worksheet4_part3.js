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
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    var subdivisionLevel = 3;
    var orbiting = false;
    var orbitAngle = 0.0;

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var va = vec4(0.0, 0.0, 1.0, 1);
    var vb = vec4(0.0, 0.942809, -0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
    var vd = vec4(0.816497, -0.471405, -0.333333, 1);

    var pointsArray = [];
    var normalsArray = [];

    function triangle(a, b, c) {
        pointsArray.push(a);
        pointsArray.push(b);
        pointsArray.push(c);

        normalsArray.push(vec4(a[0], a[1], a[2], 0.0));
        normalsArray.push(vec4(b[0], b[1], b[2], 0.0));
        normalsArray.push(vec4(c[0], c[1], c[2], 0.0));
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
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var projMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);

    var lightDirection = vec3(0.0, 0.0, -1.0);
    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);

    var kd = vec4(1.0, 0.5, 0.5, 1.0);

    var projLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    var mvLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    var lightDirLoc = gl.getUniformLocation(program, "uLightDirection");
    var lightDiffuseLoc = gl.getUniformLocation(program, "uLightDiffuse");
    var kdLoc = gl.getUniformLocation(program, "uKd");

    gl.uniformMatrix4fv(projLoc, false, flatten(projMatrix));
    gl.uniform3fv(lightDirLoc, flatten(lightDirection));
    gl.uniform4fv(lightDiffuseLoc, flatten(lightDiffuse));
    gl.uniform4fv(kdLoc, flatten(kd));

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (orbiting) {
            orbitAngle += 0.01;
        }

        var eye = vec3(3 * Math.sin(orbitAngle), 0.0, 3 * Math.cos(orbitAngle));
        var mvMatrix = lookAt(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

        gl.uniformMatrix4fv(mvLoc, false, flatten(mvMatrix));

        pointsArray = [];
        normalsArray = [];
        tetrahedron(va, vb, vc, vd, subdivisionLevel);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

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

    document.getElementById("toggleOrbit").onclick = function() {
        orbiting = !orbiting;
    };

    render();
};
