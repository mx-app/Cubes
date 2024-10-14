"use strict";
console.clear();
class Stage {
    constructor() {
        // container
        this.render = function () {
            this.renderer.render(this.scene, this.camera);
        };
        this.add = function (elem) {
            this.scene.add(elem);
        };
        this.remove = function (elem) {
            this.scene.remove(elem);
        };
        this.container = document.getElementById('game');
        // renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        // scene
        this.scene = new THREE.Scene();
        // camera
        let aspect = window.innerWidth / window.innerHeight;
        let d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.x = 2;
        this.camera.position.y = 2;
        this.camera.position.z = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        // light
        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }
    setCamera(y, speed = 0.3) {
        TweenLite.to(this.camera.position, speed, { y: y + 4, ease: Power1.easeInOut });
        TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    }
    onResize() {
        let viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    }
}

class Circle {
    constructor(circle) {
        // set size and position
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 12;
        this.dimension = { radius: 0, height: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetCircle = circle;
        this.index = (this.targetCircle ? this.targetCircle.index : 0) + 1;

        // set the dimensions from the target circle, or defaults.
        this.dimension.radius = this.targetCircle ? this.targetCircle.dimension.radius : 5;
        this.dimension.height = this.targetCircle ? this.targetCircle.dimension.height : 2;
        this.position.x = this.targetCircle ? this.targetCircle.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetCircle ? this.targetCircle.position.z : 0;
        this.colorOffset = this.targetCircle ? this.targetCircle.colorOffset : Math.round(Math.random() * 100);

        // set color
        let offset = this.index + this.colorOffset;
        var r = Math.sin(0.3 * offset) * 127 + 128; // من الأبيض إلى الأحمر
        var g = Math.sin(0.3 * offset + 2) * 127 + 128; // من الأبيض إلى البنفسجي
        var b = 255; // ثابت ليبقي اللون في نطاق الألوان

        this.color = new THREE.Color(r / 255, g / 255, b / 255);

        // state
        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;

        // set direction
        this.speed = -0.1 - (this.index * 0.005);
        if (this.speed < -4) this.speed = -4;
        this.direction = this.speed;

        // create circle
        let geometry = new THREE.CylinderGeometry(this.dimension.radius, this.dimension.radius, this.dimension.height, 32);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, this.dimension.height / 2, 0));
        this.material = new THREE.MeshToonMaterial({ color: this.color, shading: THREE.FlatShading });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);
        if (this.state == this.STATES.ACTIVE) {
            this.position.x = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        }
    }
    reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    }
    place() {
        this.state = this.STATES.STOPPED;
        let overlap = this.targetCircle.dimension.radius - Math.abs(this.position.x - this.targetCircle.position.x);
        let circlesToReturn = {
            plane: 'x',
            direction: this.direction
        };
        if (this.dimension.radius - overlap < 0.3) {
            overlap = this.dimension.radius;
            circlesToReturn.bonus = true;
            this.position.x = this.targetCircle.position.x;
            this.dimension.radius = this.targetCircle.dimension.radius;
        }
        if (overlap > 0) {
            let choppedDimensions = { radius: this.dimension.radius, height: this.dimension.height };
            choppedDimensions.radius -= overlap;
            this.dimension.radius = overlap;
            let placedGeometry = new THREE.CylinderGeometry(this.dimension.radius, this.dimension.radius, this.dimension.height, 32);
            placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, this.dimension.height / 2, 0));
            let placedMesh = new THREE.Mesh(placedGeometry, this.material);
            let choppedGeometry = new THREE.CylinderGeometry(choppedDimensions.radius, choppedDimensions.radius, choppedDimensions.height, 32);
            choppedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, choppedDimensions.height / 2, 0));
            let choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
            let choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            if (this.position.x < this.targetCircle.position.x) {
                this.position.x = this.targetCircle.position.x;
            } else {
                choppedPosition.x += overlap;
            }
            placedMesh.position.set(this.position.x, this.position.y, this.position.z);
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
            circlesToReturn.placed = placedMesh;
            if (!circlesToReturn.bonus) circlesToReturn.chopped = choppedMesh;
        } else {
            this.state = this.STATES.MISSED;
        }
        this.dimension.radius = overlap;
        return circlesToReturn;
    }
    tick() {
        if (this.state == this.STATES.ACTIVE) {
            let value = this.position.x;
            if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT) this.reverseDirection();
            this.position.x += this.direction;
            this.mesh.position.x = this.position.x;
        }
    }
}

class Game {
    constructor() {
        this.STATES = {
            'LOADING': 'loading',
            'PLAYING': 'playing',
            'READY': 'ready',
            'ENDED': 'ended',
            'RESETTING': 'resetting'
        };
        this.circles = [];
        this.state = this.STATES.LOADING;
        this.stage = new Stage();
        this.mainContainer = document.getElementById('container');
        this.scoreContainer = document.getElementById('score');
        this.startButton = document.getElementById('start-button');
        this.instructions = document.getElementById('instructions');
        this.scoreContainer.innerHTML = '0';
        this.newCircles = new THREE.Group();
        this.placedCircles = new THREE.Group();
        this.choppedCircles = new THREE.Group();
        this.stage.add(this.newCircles);
        this.stage.add(this.placedCircles);
        this.stage.add(this.choppedCircles);
        this.addCircle();
        this.tick();
        this.updateState(this.STATES.READY);
        document.addEventListener('keydown', e => {
            if (e.keyCode == 32) this.onAction();
        });
        document.addEventListener('click', e => {
            this.onAction();
        });
    }
    updateState(newState) {
        for (let key in this.STATES) this.mainContainer.classList.remove(this.STATES[key]);
        this.mainContainer.classList.add(newState);
        this.state = newState;
    }
    onAction() {
        switch (this.state) {
            case this.STATES.READY:
                this.startGame();
                break;
            case this.STATES.PLAYING:
                this.placeCircle();
                break;
            case this.STATES.ENDED:
                this.restartGame();
                break;
        }
    }
    startGame() {
        this.updateState(this.STATES.PLAYING);
        this.addCircle();
        this.addCircle();
        this.instructions.classList.add('hide');
    }
    restartGame() {
        this.circles = [];
        this.updateState(this.STATES.READY);
        this.scoreContainer.innerHTML = '0';
        this.newCircles.clear();
        this.placedCircles.clear();
        this.choppedCircles.clear();
        this.addCircle();
        this.addCircle();
    }
    endGame() {
        this.updateState(this.STATES.ENDED);
    }
    addCircle() {
        let lastCircle = this.circles[this.circles.length - 1];
        if (lastCircle && lastCircle.state == lastCircle.STATES.MISSED) {
            return this.endGame();
        }
        this.scoreContainer.innerHTML = String(this.circles.length - 1);
        let newKidOnTheBlock = new Circle(lastCircle);
        this.newCircles.add(newKidOnTheBlock.mesh);
        this.circles.push(newKidOnTheBlock);
        this.stage.setCamera(this.circles.length * 2);
        if (this.circles.length >= 5) this.instructions.classList.add('hide');
    }
    placeCircle() {
        let lastCircle = this.circles[this.circles.length - 1];
        if (!lastCircle || lastCircle.state != lastCircle.STATES.ACTIVE) return;
        let placedCircle = lastCircle.place();
        if (placedCircle) {
            if (placedCircle.bonus) {
                this.scoreContainer.innerHTML = String(Number(this.scoreContainer.innerHTML) + 1);
            }
            if (placedCircle.placed) {
                this.placedCircles.add(placedCircle.placed);
                this.stage.add(placedCircle.placed);
            }
            if (placedCircle.chopped) {
                this.choppedCircles.add(placedCircle.chopped);
                this.stage.add(placedCircle.chopped);
            }
            this.addCircle();
        }
    }
    tick() {
        if (this.state == this.STATES.PLAYING) {
            for (let i = 0; i < this.circles.length; i++) {
                this.circles[i].tick();
            }
        }
        this.stage.render();
        requestAnimationFrame(() => this.tick());
    }
}

// بدء اللعبة
let game = new Game();
