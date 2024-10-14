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
        this.renderer.setClearColor('#4D0000', 1); // لون أغمق للخلفية من التدرج
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
        //light
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
class Block {
    constructor(block) {
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 12;
        this.dimension = { width: 0, height: 0, depth: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetBlock = block;
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? 'x' : 'z';
        this.workingDimension = this.index % 2 ? 'width' : 'depth';
        this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
        this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
        this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;
        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);

        // لون المربعات ليكون أغمق من الخلفية
        let offset = this.index + this.colorOffset;
        var r = Math.sin(0.3 * offset) * 40 + 150;
        var g = Math.sin(0.3 * offset + 2) * 40 + 150;
        var b = Math.sin(0.3 * offset + 4) * 40 + 150;
        this.color = new THREE.Color(r / 255, g / 255, b / 255);

        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;
        this.speed = -0.1 - (this.index * 0.005);
        if (this.speed < -4) this.speed = -4;
        this.direction = this.speed;

        let geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        this.material = new THREE.MeshToonMaterial({ color: this.color, shading: THREE.FlatShading });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        if (this.state == this.STATES.ACTIVE) {
            this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        }
    }

    reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    }

    place() {
        this.state = this.STATES.STOPPED;
        let overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
        let blocksToReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };

        if (overlap > 0) {
            let placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            let placedMesh = new THREE.Mesh(placedGeometry, this.material);
            blocksToReturn.placed = placedMesh;
        } else {
            this.state = this.STATES.MISSED;
        }
        this.dimension[this.workingDimension] = overlap;
        return blocksToReturn;
    }

    tick() {
        if (this.state == this.STATES.ACTIVE) {
            let value = this.position[this.workingPlane];
            if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT) this.reverseDirection();
            this.position[this.workingPlane] += this.direction;
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
        }
    }
}

class Game {
    constructor() {
        this.STATES = { LOADING: 'loading', PLAYING: 'playing', READY: 'ready', ENDED: 'ended', RESETTING: 'resetting' };
        this.blocks = [];
        this.state = this.STATES.LOADING;
        this.stage = new Stage();
        this.score = 0; // بداية السكور
        this.mainContainer = document.getElementById('container');
        this.scoreContainer = document.getElementById('score');
        this.startButton = document.getElementById('start-button');
        this.scoreContainer.innerHTML = '0';
        this.newBlocks = new THREE.Group();
        this.placedBlocks = new THREE.Group();
        this.stage.add(this.newBlocks);
        this.stage.add(this.placedBlocks);
        this.addBlock();
        this.updateState(this.STATES.READY);
        document.addEventListener('click', () => {
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
                this.placeBlock();
                break;
            case this.STATES.ENDED:
                this.restartGame();
                break;
        }
    }

    startGame() {
        if (this.state != this.STATES.PLAYING) {
            this.score = 0; // إعادة تعيين السكور
            this.updateState(this.STATES.PLAYING);
            this.addBlock();
        }
    }

    placeBlock() {
        let currentBlock = this.blocks[this.blocks.length - 1];
        let newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);
        if (newBlocks.placed) {
            this.placedBlocks.add(newBlocks.placed);
            this.score += 10; // زيادة السكور بمقدار 10 لكل نقرة
            this.scoreContainer.innerHTML = this.score;
        }
        if (newBlocks.chopped) this.placedBlocks.add(newBlocks.chopped);
        this.addBlock();
    }

    addBlock() {
        let lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
            return this.endGame();
        }
        this.scoreContainer.innerHTML = String(this.score);
        let newBlock = new Block(lastBlock);
        this.newBlocks.add(newBlock.mesh);
        this.blocks.push(newBlock);
        this.stage.setCamera(this.blocks.length * 2);
    }

    endGame() {
        this.updateState(this.STATES.ENDED);
        // تحديث قاعدة البيانات هنا
        updateUserData(this.score); // التكامل مع قاعدة البيانات
    }

    tick() {
        this.blocks[this.blocks.length - 1].tick();
        this.stage.render();
        requestAnimationFrame(() => { this.tick(); });
    }
}

let game = new Game();

// تحديث البيانات في قاعدة البيانات
function updateUserData(score) {
    supabase
        .from('users')
        .update({ score: score })
        .eq('telegram_id', uiElements.userTelegramIdDisplay.innerText)
        .then(({ error }) => {
            if (error) console.error('Failed to update score:', error);
        });
}
