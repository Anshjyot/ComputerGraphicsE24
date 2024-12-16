window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    var groundVertices = new Float32Array([
        -2, -1, -1,
         2, -1, -1,
         2, -1, -5,
        -2, -1, -5
    ]);


    var groundTexCoords = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
    ]);


    var redQuadVertices = new Float32Array([
   
        0.25, -0.5, -1.25,
        0.75, -0.5, -1.25,
        0.75, -0.5, -1.75,
        0.25, -0.5, -1.75,

     
        -1, -1, -2.5,
        -1,  0, -2.5,
        -1,  0, -3,
        -1, -1, -3
    ]);




    var vPosition = gl.getAttribLocation(program, "vPosition");
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");


    var vBufferGround = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferGround);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    var tBufferGround = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBufferGround);
    gl.bufferData(gl.ARRAY_BUFFER, groundTexCoords, gl.STATIC_DRAW);


    var vBufferRedQuads = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferRedQuads);
    gl.bufferData(gl.ARRAY_BUFFER, redQuadVertices, gl.STATIC_DRAW);

  
    var groundTexture = gl.createTexture();
    var groundImage = new Image();
    groundImage.onload = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, groundImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

       
        requestAnimationFrame(render);
    };
    groundImage.src = '../../../assets/xamp23.png';


    var redTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    var redColor = new Uint8Array([255, 0, 0, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redColor);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

 
    var blackTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, blackTexture);
    var blackColor = new Uint8Array([0, 0, 0, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackColor);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

 
    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");

    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

   
    var modelViewMatrix = mat4();

    modelViewMatrix = mult(modelViewMatrix, translate(0,0,0));
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));


    var theta = 0;
    var animateLight = true;
    var lightCenter = vec3(0, 2, -2);
    var lightRadius = 2.0;

    document.getElementById("toggleBtn").onclick = function() {
        animateLight = !animateLight;
    };

    var d = -3;
    var Mp = mat4(
        vec4(1,    0,    0,   0),
        vec4(0,    1,    0,   0),
        vec4(0,    0,    1,   0),
        vec4(0, 1/d,    0,   1) 
    );

    function getLightPosition() {
        return vec3(
            lightCenter[0] + lightRadius * Math.cos(theta),
            lightCenter[1],
            lightCenter[2] + lightRadius * Math.sin(theta)
        );
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  
        if(animateLight) {
            theta += 0.01;
        }

        var lightPos = getLightPosition();

        gl.bindBuffer(gl.ARRAY_BUFFER, vBufferGround);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, tBufferGround);
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

 
        var groundMVM = mat4();
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(groundMVM));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

       
        var Tneg = translate(-lightPos[0], -lightPos[1], -lightPos[2]);
        var Tpos = translate(lightPos[0], lightPos[1], lightPos[2]);
        var Ms = mult(Tpos, mult(Mp, Tneg));

        gl.bindBuffer(gl.ARRAY_BUFFER, vBufferRedQuads);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

      
        gl.disableVertexAttribArray(vTexCoord);

     
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, blackTexture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 2);

        
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, -1.0);


        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(Ms));


        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
       
        gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);

 
        gl.disable(gl.POLYGON_OFFSET_FILL);

     
        gl.bindBuffer(gl.ARRAY_BUFFER, vBufferRedQuads);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.disableVertexAttribArray(vTexCoord);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, redTexture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 1);

     
        var redMVM = mat4();
        gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(redMVM));


        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

       
        gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);

        requestAnimationFrame(render);
    }
};