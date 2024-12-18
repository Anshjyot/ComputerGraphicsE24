var groundTexture = document.createElement('img');
groundTexture.src = '../../../assets/xamp23.png';

var gl;
var program, lightProgram, depthProgram;
var programInfo, lightModel, depthModel;
var positions, textureCoords, normals;
var viewMatrix, projectionMatrix, depthViewMatrix;
var shadowProjectionMatrix;
var eye, at, up;
var fovy, aspect, near, far;
var floor;
var light;
var R, p, v;

var moveTeapot = true;
var moveLight = true;
var phi, theta;

var framebuffer, depthTextureExt, colorTexture;
var size;

async function initializeVariables() {

    at = vec3(0, 0, -3);
    eye = vec3(0, 0, 1);
    up = vec3(0, 1, 0);

    fovy = 65;
    aspect = canvas.width / canvas.height;
    near = 0.1;
    far = 30;

    light = vec3(0.0, 2.0, -2.0);

    floor = {};
    floor.positions = [
        vec3(-2, -1, -1),
        vec3(2, -1, -1),
        vec3(2, -1, -5),
        vec3(-2, -1, -1),
        vec3(2, -1, -5),
        vec3(-2, -1, -5)
    ];
    floor.textureCoords = [
        vec2(0, 0),
        vec2(1, 0),
        vec2(1, 1),
        vec2(0, 0),
        vec2(1, 1),
        vec2(0, 1)
    ];
    floor.normals = [
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0)
    ];

    viewMatrix = lookAt(eye, at, up);
    depthViewMatrix = lookAt(light, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);

    shadowProjectionMatrix = mat4();
    shadowProjectionMatrix[3][3] = 0;
    shadowProjectionMatrix[3][1] = -1 / light[1];

    positions = [].concat(floor.positions);
    textureCoords = [].concat(floor.textureCoords);
    normals = [].concat(floor.normals);

    
    console.log("Loading teapot OBJ file...");
    const teapot = await readOBJFile('../../../assets/teapot/teapot.obj', 0.3, false);

    if (!teapot) {
        console.error("Failed to load teapot OBJ file.");
        return;
    }

    console.log("Teapot OBJ loaded successfully:", teapot);

   
    teapot.indices.forEach((index) => {
        positions.push(vec3(
            teapot.vertices[index * 4],
            teapot.vertices[index * 4 + 1],
            teapot.vertices[index * 4 + 2]
        ));
        normals.push(vec3(
            teapot.normals[index * 4],
            teapot.normals[index * 4 + 1],
            teapot.normals[index * 4 + 2]
        ));
        textureCoords.push(vec2(0, 0)); 
    });

    console.log("Buffers populated with teapot data.");
}

function initViewport() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}


function createRMatrix(v, p) {
    return mat4(
        1-2*v[0]*v[0],  -2*v[0]*v[1],   -2*v[0]*v[2],   2*(dot(p, v))*v[0],
        -2*v[0]*v[1],   1-2*v[1]*v[1],  -2*v[1]*v[2],   2*(dot(p, v))*v[1],
        -2*v[0]*v[2],   -2*v[1]*v[2],   1-2*v[2]*v[2],  2*(dot(p, v))*v[2],
        0,              0,              0,              1
    );
}


function matrixVectorMult(A, x) {
    var Ax = [];
    for (var i = 0; i < x.length; i++) {
        var sum = 0;
        for (var j = 0; j < x.length; j++) {
            sum += A[j][i] * x[i];
        }
        Ax.push(sum);
    }
    return Ax;
}

async function main() {    
    const canvasElement = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvasElement, { alpha: false, stencil: true });
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }
    window.gl = gl; 
    gl.viewportWidth = canvasElement.width;
    gl.viewportHeight = canvasElement.height;

    await initializeVariables();
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    lightProgram = initShaders( gl, "lighting-vertex-shader", "lighting-fragment-shader" );
    depthProgram = initShaders( gl, "depth-vertex-shader", "depth-fragment-shader" );
    initViewport();

    depthTextureExt = gl.getExtension("WEBKIT_WEBGL_depth_texture") || gl.getExtension("WEBGL_depth_texture");
    size = Math.pow(2,9);

    
    colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

 
    gl.activeTexture(gl.TEXTURE3);
    let depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   
    gl.useProgram(program);
    programInfo = {
        a_position: {
            location: gl.getAttribLocation(program, 'a_position'),
            buffer: gl.createBuffer()
        },
        a_textureCoords: {
            location: gl.getAttribLocation(program, 'a_textureCoords'),
            buffer: gl.createBuffer()
        },
        u_modelView: gl.getUniformLocation(program, 'u_modelView'),
        u_projection: gl.getUniformLocation(program, 'u_projection'),
        u_texture: gl.getUniformLocation(program, 'u_texture'),
        u_shadow: gl.getUniformLocation(program, 'u_shadow'),
        u_depthMVP: gl.getUniformLocation(program, 'u_depthMVP')
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_textureCoords.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    
    gl.useProgram(lightProgram);
    lightModel = {
        a_position_model: {
            location: gl.getAttribLocation(lightProgram, 'a_position_model'),
            buffer: gl.createBuffer()
        },
        a_normal_model: {
            location: gl.getAttribLocation(lightProgram, 'a_normal_model'),
            buffer: gl.createBuffer()
        },
        u_modelView: gl.getUniformLocation(lightProgram, 'u_modelView'),
        u_projection: gl.getUniformLocation(lightProgram, 'u_projection'),
        u_normal: gl.getUniformLocation(lightProgram, 'u_normal'),
        u_light_world: gl.getUniformLocation(lightProgram, 'u_light_world')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_position_model.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_normal_model.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    gl.uniformMatrix4fv(lightModel.u_projection, false, flatten(projectionMatrix));


    gl.useProgram(depthProgram);
    depthModel = {
        a_position: {
            location: gl.getAttribLocation(depthProgram, 'a_position'),
            buffer: gl.createBuffer()
        },
        u_modelView: gl.getUniformLocation(depthProgram, 'u_modelView'),
        u_projection: gl.getUniformLocation(depthProgram, 'u_projection')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, depthModel.a_position.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    createGroundTextures(gl, groundTexture);
    gl.useProgram(program);
    gl.uniformMatrix4fv(programInfo.u_projection, false, flatten(projectionMatrix));

    p = floor.positions[0];
    v = normalize(cross(subtract(floor.positions[1], floor.positions[0]), subtract(floor.positions[2], floor.positions[0])));
    R = createRMatrix(v, p);

    phi = 0;
    theta = 0;

    document.getElementById("button-ToggleTeapot").onclick = () => { moveTeapot = !moveTeapot };
    document.getElementById("button-ToggleLight").onclick = () => { moveLight = !moveLight };


    function drawPlaneStencil() {
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position.buffer);
        gl.enableVertexAttribArray(programInfo.a_position.location);
        gl.vertexAttribPointer(programInfo.a_position.location, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_textureCoords.buffer);
        gl.enableVertexAttribArray(programInfo.a_textureCoords.location);
        gl.vertexAttribPointer(programInfo.a_textureCoords.location, 2, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(programInfo.u_modelView, false, flatten(viewMatrix));
        gl.uniform1i(programInfo.u_texture, 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.uniform1i(programInfo.u_shadow, 3);
        gl.uniformMatrix4fv(programInfo.u_depthMVP, false, flatten(mult(projectionMatrix, depthViewMatrix)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawTeapotReflected(teapotModelMatrix, reflectionProjectionMatrix) {
        gl.useProgram(lightProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_position_model.buffer);
        gl.enableVertexAttribArray(lightModel.a_position_model.location);
        gl.vertexAttribPointer(lightModel.a_position_model.location, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_normal_model.buffer);
        gl.enableVertexAttribArray(lightModel.a_normal_model.location);
        gl.vertexAttribPointer(lightModel.a_normal_model.location, 3, gl.FLOAT, false, 0, 0);

      
        gl.uniformMatrix4fv(lightModel.u_projection, false, flatten(reflectionProjectionMatrix));

        gl.uniformMatrix4fv(lightModel.u_modelView, false, flatten(mult(mult(viewMatrix, R), teapotModelMatrix)));
        let lightR4 = matrixVectorMult(R, vec4(light[0], light[1], light[2], 1));
        let lightR = vec3(lightR4[0], lightR4[1], lightR4[2]);

        gl.uniform3fv(lightModel.u_light_world, flatten(lightR));
        gl.uniformMatrix4fv(lightModel.u_normal, false, flatten(transpose(inverse4(mult(mult(viewMatrix, R), teapotModelMatrix)))));

        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
    }

    function drawPlane() {

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position.buffer);
        gl.enableVertexAttribArray(programInfo.a_position.location);
        gl.vertexAttribPointer(programInfo.a_position.location, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_textureCoords.buffer);
        gl.enableVertexAttribArray(programInfo.a_textureCoords.location);
        gl.vertexAttribPointer(programInfo.a_textureCoords.location, 2, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(programInfo.u_modelView, false, flatten(viewMatrix));
        gl.uniform1i(programInfo.u_texture, 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.uniform1i(programInfo.u_shadow, 3);
        gl.uniformMatrix4fv(programInfo.u_depthMVP, false, flatten(mult(projectionMatrix, depthViewMatrix)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(function render() {
        phi += moveTeapot ? 0.02 : 0;
        theta += moveLight ? 0.01 : 0;
        
        light[0] = Math.sin(theta) * 2;
        light[2] = Math.cos(theta) * 2 - 2;
        
        depthViewMatrix = lookAt(light, at, up);
        
        let teapotModelMatrix = translate(0, -0.75 - 0.25 * Math.sin(phi), -3);
        let teapotModelViewMatrix = mult(viewMatrix, teapotModelMatrix);

       
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, size, size);
        gl.colorMask(false, false, false, false);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(depthProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, depthModel.a_position.buffer);
        gl.enableVertexAttribArray(depthModel.a_position.location);
        gl.vertexAttribPointer(depthModel.a_position.location, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(depthModel.u_projection, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(depthModel.u_modelView, false, flatten(mult(depthViewMatrix, teapotModelMatrix)));
        
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvasElement.width, canvasElement.height);
        gl.colorMask(true, true, true, true);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   
        gl.useProgram(lightProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_position_model.buffer);
        gl.enableVertexAttribArray(lightModel.a_position_model.location);
        gl.vertexAttribPointer(lightModel.a_position_model.location, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_normal_model.buffer);
        gl.enableVertexAttribArray(lightModel.a_normal_model.location);
        gl.vertexAttribPointer(lightModel.a_normal_model.location, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(lightModel.u_normal, false, flatten(transpose(inverse4(teapotModelViewMatrix))));
        
      
        gl.uniformMatrix4fv(lightModel.u_projection, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(lightModel.u_modelView, false, flatten(teapotModelViewMatrix));
        gl.uniform3fv(lightModel.u_light_world, flatten(light));
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
        
      
        gl.enable(gl.STENCIL_TEST);
     
        gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
     
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        gl.stencilMask(0xFF);
        gl.depthMask(false);
        gl.colorMask(false, false, false, false);
        gl.clear(gl.STENCIL_BUFFER_BIT);

   
        drawPlaneStencil();

     
        gl.stencilFunc(gl.EQUAL, 1, 0xFF);
        gl.stencilMask(0x00); 
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);


        let planeWorld = vec4(0, 1, 0, 1); 
        let invView = inverse4(viewMatrix);
        let invViewT = transpose(invView);
        let planeEye = mult(invViewT, planeWorld);

        let reflectionProjectionMatrix = modifyProjectionMatrix(planeEye, projectionMatrix);


        drawTeapotReflected(teapotModelMatrix, reflectionProjectionMatrix);

     
        gl.clear(gl.DEPTH_BUFFER_BIT);

       
        gl.disable(gl.STENCIL_TEST);

      
        gl.useProgram(program);
        gl.uniformMatrix4fv(programInfo.u_projection, false, flatten(projectionMatrix));
        drawPlane();

        requestAnimationFrame(render);
    })
}

function modifyProjectionMatrix(clipplane, projection) {

    var oblique = mult(mat4(), projection);
    var q = vec4(
        (Math.sign(clipplane[0]) + projection[0][2]) / projection[0][0],
        (Math.sign(clipplane[1]) + projection[1][2]) / projection[1][1],
        -1.0,
        (1.0 + projection[2][2]) / projection[2][3]
    );
    var s = 2.0 / dot(clipplane, q);
    oblique[2] = vec4(
        clipplane[0]*s,
        clipplane[1]*s,
        clipplane[2]*s + 1.0,
        clipplane[3]*s
    );
    return oblique;
}

function createGroundTextures(gl, groundImage) {
    gl.activeTexture(gl.TEXTURE0);
    var groundTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, groundTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, groundImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.activeTexture(gl.TEXTURE1);
    var redTexture = gl.createTexture();
    var redImage = new Uint8Array([255, 0, 0]);
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, redImage);

    gl.activeTexture(gl.TEXTURE2);
    var blackTexture = gl.createTexture();
    var blackImage = new Uint8Array([0, 0, 0, 200]);
    gl.bindTexture(gl.TEXTURE_2D, blackTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackImage);
}