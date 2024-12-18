window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var projMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    var projLoc = gl.getUniformLocation(program, 'uProjectionMatrix');
    gl.uniformMatrix4fv(projLoc, false, flatten(projMatrix));

    readOBJFile('../../assets/Cup.obj', 0.5, false).then(function (model) {
        if (!model) {
            console.log("Failed to load OBJ file.");
            return;
        }

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

        var vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        var nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);

        var vNormal = gl.getAttribLocation(program, "vNormal");
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        var lightDirection = vec3(0.0, 0.5, -1.0);
        var lightDirLoc = gl.getUniformLocation(program, 'uLightDirection');
        gl.uniform3fv(lightDirLoc, flatten(lightDirection));

        var kd = vec4(0.8, 0.8, 0.8, 1.0);
        var kdLoc = gl.getUniformLocation(program, 'uKd');
        gl.uniform4fv(kdLoc, flatten(kd));

        var ka = 0.2;
        var kaLoc = gl.getUniformLocation(program, 'uKa');
        gl.uniform1f(kaLoc, ka);

        var ks = 0.1;
        var ksLoc = gl.getUniformLocation(program, 'uKs');
        gl.uniform1f(ksLoc, ks);

        var shininess = 10.0; 
        var shininessLoc = gl.getUniformLocation(program, 'uShininess');
        gl.uniform1f(shininessLoc, shininess);

        var mvMatrixLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
        var orbiting = false;
        var orbitAngle = 0.0;

        function render() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            if (orbiting) {
                orbitAngle += 0.01;
            }
            var eye = vec3(8 * Math.sin(orbitAngle), 0.0, 8 * Math.cos(orbitAngle));  
            var mvMatrix = lookAt(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
            gl.uniformMatrix4fv(mvMatrixLoc, false, flatten(mvMatrix));

            var indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);
            gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);

            requestAnimationFrame(render);
        }

        render();

 
        document.getElementById("kaSlider").oninput = function(event) {
            ka = parseFloat(event.target.value);
            gl.uniform1f(kaLoc, ka);
        };

        document.getElementById("kdSlider").oninput = function(event) {
            kd[0] = parseFloat(event.target.value);
            gl.uniform4fv(kdLoc, flatten(kd));
        };

        document.getElementById("ksSlider").oninput = function(event) {
            ks = parseFloat(event.target.value);
            gl.uniform1f(ksLoc, ks);
        };

        document.getElementById("shininessSlider").oninput = function(event) {
            shininess = parseFloat(event.target.value);
            gl.uniform1f(shininessLoc, shininess);
        };

        document.getElementById("toggleOrbit").onclick = function() {
            orbiting = !orbiting;
        };
    });
};
