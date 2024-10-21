window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 1.0, 1.0); 
    gl.enable(gl.DEPTH_TEST);

 
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

 
    var sphereData = generateSphere(1.0, 64, 64);  

    function flattenVec3(arr) {
        var flat = [];
        for (var i = 0; i < arr.length; i++) {
            flat.push(arr[i][0], arr[i][1], arr[i][2]);
        }
        return new Float32Array(flat);
    }

  
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    var flatVertices = flattenVec3(sphereData.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatVertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

  
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    var flatNormals = flattenVec3(sphereData.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatNormals, gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

  
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(0, 0, 3), vec3(0, 0, 0), vec3(0, 1, 0));

    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    var uLightDirection = gl.getUniformLocation(program, "uLightDirection");
    gl.uniform3fv(uLightDirection, vec3(1.0, 1.0, -1.0));

    var uAmbientLight = gl.getUniformLocation(program, "uAmbientLight");
    gl.uniform3fv(uAmbientLight, vec3(0.5, 0.5, 0.5));

    var uDiffuseLight = gl.getUniformLocation(program, "uDiffuseLight");
    gl.uniform3fv(uDiffuseLight, vec3(0.9, 0.9, 0.9));

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    var texture = gl.createTexture();
    var image = new Image();
    image.src = "../../../assets/earth.jpg";  
    image.onload = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

      
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    
        var ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) {
            var maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); 
        
        var uTexture = gl.getUniformLocation(program, "uTexture");
        gl.uniform1i(uTexture, 0);

        
        render();
    };


    var isMouseDown = false;
    var lastMouseX = 0;
    var lastMouseY = 0;
    var rotationX = 0;
    var rotationY = 0;

 
    canvas.addEventListener('mousedown', function(event) {
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mouseup', function() {
        isMouseDown = false;
    });

    canvas.addEventListener('mousemove', function(event) {
        if (!isMouseDown) return;

        var newX = event.clientX;
        var newY = event.clientY;

        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;

        rotationX += deltaX * 0.5;
        rotationY += deltaY * 0.5;

        lastMouseX = newX;
        lastMouseY = newY;
    });

 
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

       
        var rotationMatrixX = rotateX(rotationY);
        var rotationMatrixY = rotateY(rotationX);

       
        var rotationMatrix = mult(rotationMatrixX, rotationMatrixY);

        var modelViewMatrix = mult(viewMatrix, rotationMatrix);
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));


        gl.drawArrays(gl.TRIANGLES, 0, sphereData.vertices.length);


        requestAnimationFrame(render);
    }

  
    function generateSphere(radius, rows, columns) {
        var vertices = [];
        var normals = [];

        for (var latNumber = 0; latNumber <= rows; ++latNumber) {
            var theta = latNumber * Math.PI / rows;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var longNumber = 0; longNumber <= columns; ++longNumber) {
                var phi = longNumber * 2 * Math.PI / columns;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = cosTheta;
                var z = sinPhi * sinTheta;

                normals.push(vec3(x, y, z));
                vertices.push(vec3(radius * x, radius * y, radius * z));
            }
        }

        var sphereVertices = [];
        var sphereNormals = [];

        for (var latNumber = 0; latNumber < rows; ++latNumber) {
            for (var longNumber = 0; longNumber < columns; ++longNumber) {
                var first = (latNumber * (columns + 1)) + longNumber;
                var second = first + columns + 1;

                sphereVertices.push(vertices[first]);
                sphereVertices.push(vertices[second]);
                sphereVertices.push(vertices[first + 1]);

                sphereNormals.push(normals[first]);
                sphereNormals.push(normals[second]);
                sphereNormals.push(normals[first + 1]);

                sphereVertices.push(vertices[second]);
                sphereVertices.push(vertices[second + 1]);
                sphereVertices.push(vertices[first + 1]);

                sphereNormals.push(normals[second]);
                sphereNormals.push(normals[second + 1]);
                sphereNormals.push(normals[first + 1]);
            }
        }

        return {
            vertices: sphereVertices,
            normals: sphereNormals
        };
    }
};
