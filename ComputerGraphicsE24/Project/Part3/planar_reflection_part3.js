// Load ground texture image
let groundTexture = document.createElement('img');
groundTexture.src = '../../../assets/xamp23.png';
let positions = [];
let normals = [];
let textureCoords = [];

let gl, program, lightProgram, depthProgram;
let programModel, lightModel, depthModel;
let at, eye, up, fovy, aspect, near, far;
let light;
let projectionMatrix, viewMatrix, depthViewMatrix;
let R, p, v, phi, theta;
let moveTeapot, moveLight;
let depthTexture, framebuffer, colorTexture;
let size;
let ground;

async function initializeVariables() {
    // Camera setup
    at = vec3(0, 0, -3);
    eye = vec3(0, 0, 1);
    up = vec3(0, 1, 0);

    fovy = 65;
    aspect = canvas.width / canvas.height;
    near = 0.1;
    far = 30;

    light = vec3(0.0, 2.0, -2.0);

    // Ground data
    ground = {};
    ground.positions = [
        vec3(-2, -1, -1),
        vec3(2, -1, -1),
        vec3(2, -1, -5),
        vec3(-2, -1, -1),
        vec3(2, -1, -5),
        vec3(-2, -1, -5)
    ];
    ground.textureCoords = [
        vec2(0, 0),
        vec2(1, 0),
        vec2(1, 1),
        vec2(0, 0),
        vec2(1, 1),
        vec2(0, 1)
    ];
    ground.normals = [
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0)
    ];

    // Matrices
    viewMatrix = lookAt(eye, at, up);
    depthViewMatrix = lookAt(light, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);

    // Initialize positions, normals, and textureCoords with ground data
    positions = [].concat(ground.positions);
    textureCoords = [].concat(ground.textureCoords);
    normals = [].concat(ground.normals);

    // Load and parse the OBJ file asynchronously
    console.log("Loading teapot OBJ file...");
    const teapot = await readOBJFile('../../../assets/teapot/teapot.obj', 0.3, false);

    if (!teapot) {
        console.error("Failed to load teapot OBJ file.");
        return;
    }

    console.log("Teapot loaded successfully:", teapot);

    // Append teapot vertex data
    for (let i = 0; i < teapot.indices.length; i++) {
        const idx = teapot.indices[i];

        positions.push(vec3(
            teapot.vertices[idx * 4], 
            teapot.vertices[idx * 4 + 1], 
            teapot.vertices[idx * 4 + 2]
        ));

        normals.push(vec3(
            teapot.normals[idx * 4], 
            teapot.normals[idx * 4 + 1], 
            teapot.normals[idx * 4 + 2]
        ));

        // Placeholder texture coordinates for teapot
        textureCoords.push(vec2(0, 0));
    }

    p = ground.positions[0];
    v = normalize(
        cross(subtract(ground.positions[1], ground.positions[0]),
        subtract(ground.positions[2], ground.positions[0]))
    );
    // Reflection matrix about ground plane
    R = createRMatrix(v, p);

    phi = 0;
    theta = 0;
}

// Viewport and initial GL setup
function initViewport() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

// Create reflection matrix
function createRMatrix(v, p) {
    return mat4(
        1-2*v[0]*v[0],  -2*v[0]*v[1],   -2*v[0]*v[2],   2*(dot(p, v))*v[0] ,
        -2*v[0]*v[1],   1-2*v[1]*v[1],  -2*v[1]*v[2],   2*(dot(p, v))*v[1] ,
        -2*v[0]*v[2],   -2*v[1]*v[2],   1-2*v[2]*v[2],  2*(dot(p, v))*v[2] ,
        0,              0,              0,              1
    );
}

// Just a helper (not strictly needed here)
function matrixVectorMult(A, x) {
    var Ax = [];
    for (var i = 0; i < x.length; i++) {
        var sum = 0;
        for (var j = 0; j < x.length; j++) {
            sum += A[j][i] * x[j];
        }
        Ax.push(sum);
    }
    return Ax;
}

async function main() {    
    const canvas = document.getElementById("canvas");
    // Request stencil buffer here
    gl = WebGLUtils.setupWebGL(canvas, { alpha: false, stencil: true });
    if (!gl) {
        alert("WebGL isn't supported");
        return;
    }
    window.gl = gl; // Optional global reference

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    await initializeVariables();
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    lightProgram = initShaders( gl, "lighting-vertex-shader", "lightning-fragment-shader" );
    depthProgram = initShaders( gl, "depth-vertex-shader", "depth-fragment-shader" );
    initViewport();

    let depthTextureExt = gl.getExtension("WEBKIT_WEBGL_depth_texture") || gl.getExtension("WEBGL_depth_texture");
    size = Math.pow(2,9);

    // Create a color texture for the framebuffer
    colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // Create the depth texture
    gl.activeTexture(gl.TEXTURE3);
    depthTexture = gl.createTexture();
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

    // Setup main program buffers and uniforms
    gl.useProgram(program);
    programModel = {
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

    gl.bindBuffer(gl.ARRAY_BUFFER, programModel.a_position.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, programModel.a_textureCoords.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    // Setup light program
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


    // Setup depth program
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
    gl.uniformMatrix4fv(programModel.u_projection, false, flatten(projectionMatrix));

    // Control buttons
    moveTeapot = true;
    moveLight = true;
    document.getElementById("button-teapot").onclick = () => { moveTeapot = !moveTeapot };
    document.getElementById("button-light").onclick = () => { moveLight = !moveLight };

    // Enable stencil test
    gl.enable(gl.STENCIL_TEST);

    render();

    function drawReflectedTeapot(teapotModelViewMatrix, teapotModelMatrix) {
        gl.depthFunc(gl.LESS);
        gl.useProgram(lightProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_position_model.buffer);
        gl.enableVertexAttribArray(lightModel.a_position_model.location);
        gl.vertexAttribPointer(lightModel.a_position_model.location, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, lightModel.a_normal_model.buffer);
        gl.enableVertexAttribArray(lightModel.a_normal_model.location);
        gl.vertexAttribPointer(lightModel.a_normal_model.location, 3, gl.FLOAT, false, 0, 0);

        // Normal for the original teapot
        gl.uniformMatrix4fv(lightModel.u_normal, false, flatten(transpose(inverse4(teapotModelViewMatrix))));
        gl.uniformMatrix4fv(lightModel.u_modelView, false, flatten(teapotModelViewMatrix));
        gl.uniform3fv(lightModel.u_light_world, flatten(light));
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);

        // Now for the reflected version using R
        gl.uniformMatrix4fv(lightModel.u_modelView, false, flatten(mult(mult(viewMatrix, R), teapotModelMatrix)));

        let lightR4 = matrixVectorMult(R, vec4(light[0], light[1], light[2], 1));
        let lightR = vec3(lightR4[0], lightR4[1], lightR4[2]);

        gl.uniform3fv(lightModel.u_light_world, flatten(lightR));
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
    }

    function drawPlane() {
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, programModel.a_position.buffer);
        gl.enableVertexAttribArray(programModel.a_position.location);
        gl.vertexAttribPointer(programModel.a_position.location, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, programModel.a_textureCoords.buffer);
        gl.enableVertexAttribArray(programModel.a_textureCoords.location);
        gl.vertexAttribPointer(programModel.a_textureCoords.location, 2, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(programModel.u_modelView, false, flatten(viewMatrix));
        gl.uniform1i(programModel.u_texture, 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.uniform1i(programModel.u_shadow, 3);
        gl.uniformMatrix4fv(programModel.u_depthMVP, false, flatten(mult(projectionMatrix, depthViewMatrix)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawTeapotDepth(teapotModelMatrix) {
        gl.useProgram(depthProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, depthModel.a_position.buffer);
        gl.enableVertexAttribArray(depthModel.a_position.location);
        gl.vertexAttribPointer(depthModel.a_position.location, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(depthModel.u_projection, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(depthModel.u_modelView, false, flatten(mult(depthViewMatrix, teapotModelMatrix)));

        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
    }

    function render() {
        phi += moveTeapot ? 0.03 : 0;
        theta += moveLight ? 0.01 : 0;
        
        light[0] = Math.sin(theta) * 2;
        light[2] = Math.cos(theta) * 2 - 2;
        
        depthViewMatrix = lookAt(light, at, up);
        
        var teapotModelMatrix = translate(0, - 0.05 - 0.2 * Math.sin(phi), -4);

        var teapotModelViewMatrix = mult(viewMatrix, teapotModelMatrix);

        // Render to depth texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, size, size);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawTeapotDepth(teapotModelMatrix);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Back to default framebuffer
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        // Step 1: Draw the ground into the stencil buffer (no color)
        gl.colorMask(false, false, false, false);
        gl.depthMask(false);
        gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

        // This marks where the ground is in the stencil buffer
        drawPlane();

        // Step 2: Draw the reflected teapot only where stencil == 1
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);
        gl.stencilFunc(gl.EQUAL, 1, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        drawReflectedTeapot(teapotModelViewMatrix, teapotModelMatrix);

        // Step 3: Reset stencil to draw plane and other objects normally
        gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        // Draw the plane again to cover the reflection correctly
        drawPlane();

        requestAnimationFrame(render);
    }
}

function createGroundTextures(gl, groundImage) {
    gl.activeTexture(gl.TEXTURE0);
    var gTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gTex);
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
