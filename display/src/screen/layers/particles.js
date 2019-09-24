// https://greensock.com/forums/topic/15987-can-you-get-time-since-last-update-from-the-timeline/
// https://github.com/pixijs/pixi-particles
// https://www.npmjs.com/package/pixi-particles
// view-source:https://pixijs.io/pixi-particles/examples/flame.html
// view-source:https://pixijs.io/pixi-particles/examples/js/ParticleExample.js
// https://jameskiefer.com/posts/getting-started-with-pixi.js-and-webpack/
// https://pixijs.io/pixi-particles/docs/classes/emitter.html#particleconstructor
// https://github.com/pixijs/pixi-particles/issues/57
// https://greensock.com/forums/topic/18260-pixiplugin-color/
// https://codepen.io/ianmcgregor/pen/CtjeI
// http://scottmcdonnell.github.io/pixi-examples/index.html?s=demos&f=blendmodes.js&title=BlendModes

import * as PIXI from 'pixi.js'
import * as PIXI_particles from 'pixi-particles';

import { capitalize, isObject } from 'calaldees_libs/es6/core';

import { bindRecursivelyReplaceStringsWithObjectReferences } from '../../utils/StringTools';


require('../../styles/layers/particles.scss');


const DEFAULT_PATH_MEDIA = '/';  // TODO: Import this from a central location
const DEFAULT_PARTICLE_IMAGES = ['assets/particle.png', ];
const DEFAULT_TIME_FACTOR = 0.001;


export class particles {
    constructor(element, kwargs) {
        this.element = element;
        Object.assign(this, {
            console: console,
            mediaUrl: (new URLSearchParams(window.location.search)).get('path_media') || DEFAULT_PATH_MEDIA,
        }, kwargs);

        this._update = this._update.bind(this);

        this._requestAnimationFrameTimestamp = undefined;
        this._updateAnimationFrameId = undefined;

        this._canvas = document.createElement('canvas');
        this._canvas.height = 480;
        const aspectRatio = this.element.clientHeight && this.element.clientWidth ? (this.element.clientWidth / this.element.clientHeight) : 16/9;
        this._canvas.width = aspectRatio * this._canvas.height;
        this.element.appendChild(this._canvas);
        this._pixi_renderer = PIXI.autoDetectRenderer(
            this._canvas.width,
            this._canvas.height,
            {
                view: this._canvas,
                antialiasing: false,
                transparent: true,
                resolution: 1,
            },
        )
        this._pixi_container_root = new PIXI.Container();
        this._pixi_container_emitter = new PIXI.Container();
        //this._pixi_container_root.addChild(new PIXI.Sprite.fromImage('assets/logo.png'));
        this._pixi_container_root.addChild(this._pixi_container_emitter);


        this._emitters = new Map();

        this.funcReplaceStringReferences = bindRecursivelyReplaceStringsWithObjectReferences(
            new Map([
                ['emitter::', this._emitters],
            ]),
            this._canvas,
        );
    }


    pause(msg) {return this.stop(msg);}  // TODO: remove alias?
    stop(msg) {
        cancelAnimationFrame(this._updateAnimationFrameId);
        this._updateAnimationFrameId = undefined;
    }

    // static
    _updateEmitterConfig(emitter, emitterConfig) {
        console.assert(emitter);
        console.assert(emitterConfig);
        // Thanks pixi particles. You could of given us a way to update the config. Now I have to write one myself.
        for (const [key, value] of Object.entries(emitterConfig)) {
            if (['alpha', 'speed', 'scale', 'color'].indexOf(key) >= 0) {
                emitter[`start${capitalize(key)}`] = PIXI_particles.PropertyNode.createList(value);
            }
            else if (['lifetime', 'startRotation', 'rotationSpeed'].indexOf(key) >= 0) {
                console.warn('implementation incomplete', key, value);
            }
            else if(['particlesPerWave', 'frequency', 'spawnChance', 'emitterLifetime', 'maxParticles'].indexOf(key) >= 0) {
                emitter[key] = value;
            }
            else if (['pos', ].indexOf(key) >= 0) {
                emitter.updateSpawnPos(Number(value.x), Number(value.y));
            }
            else {
                console.warn('unsupported property', key, value);
            }
        }
    }

    start(msg) {
        this.stop();

        if (!isObject(msg.emitters)) {
            console.warn('No emitters provided');
            return;
        }
        console.log(msg);
        for (const [emitter_name, emitter_data] of Object.entries(msg.emitters)) {
            const emitter = this._emitters.get(emitter_name);
            const emitterConfig = this.funcReplaceStringReferences(emitter_data.emitterConfig);

            if (!emitter) {
                const images = Array.isArray(emitter_data.particleImages) ? emitter_data.particleImages : DEFAULT_PARTICLE_IMAGES;
                this._emitters.set(emitter_name, new PIXI_particles.Emitter(
                    this._pixi_container_emitter,
                    images.map(PIXI.Texture.fromImage),
                    emitterConfig,
                ));
            } else {
                this._updateEmitterConfig(
                    emitter,
                    emitterConfig,
                );
            }
        }

        this._requestAnimationFrameTimestamp = Date.now();
        this._update();
    }

    _update() {
        this._updateAnimationFrameId = requestAnimationFrame(this._update);
        const now = Date.now();
        for (const emitter of this._emitters.values()) {
            emitter.update((now - this._requestAnimationFrameTimestamp) * DEFAULT_TIME_FACTOR);
        }
        this._requestAnimationFrameTimestamp = now;
        this._pixi_renderer.render(this._pixi_container_root);
    }

    empty() {
        this.stop();
        for (const [emitter_name, emitter] of this._emitters.entries()) {
            emitter.destroy();
            this._emitters.delete(emitter_name);
        }
        //reset SpriteRenderer's batching to fully release particles for GC
        const r = this._pixi_renderer;
        if (r.plugins && r.plugins.sprite && r.plugins.sprite.sprites) {
            r.plugins.sprite.sprites.length = 0;
        }
        this._pixi_renderer.render(this._pixi_container_root);
    }

}
particles.className = 'particles';