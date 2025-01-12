import { Container } from "@pixi/display";
import { Graphics } from "@pixi/graphics";
import type { IAnimationState, IAnimationStateData } from "./core/IAnimation";
import type { IClippingAttachment, IMeshAttachment, IRegionAttachment, ISkeleton, ISkeletonData, IVertexAttachment } from "./core/ISkeleton";
import type { SpineBase } from "./SpineBase";
import { AttachmentType } from "./core/AttachmentType";
import { SkeletonBoundsBase } from "./core/SkeletonBoundsBase";

/**
 * Make a class that extends from this interface to create your own debug renderer.
 * @public
 */
export interface ISpineDebugRenderer {
    /**
     * This will be called every frame, after the spine has been updated. 
     */
    renderDebug(spine:SpineBase< ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>):void;

    /**
     *  This is called when the `spine.debug` object is set to null or when the spine is destroyed.
     */
    unregisterSpine(spine:SpineBase< ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>):void

    /**
     * This is called when the `spine.debug` object is set to a new instance of a debug renderer.
     */
    registerSpine(spine:SpineBase< ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>):void
}

type DebugDisplayObjects = {
    bones: Container;
    skeletonXY: Graphics;
    regionAttachmentsShape: Graphics;
    meshTrianglesLine: Graphics;
    meshHullLine: Graphics;
    clippingPolygon: Graphics;
    boundingBoxesRect: Graphics;
    boundingBoxesCircle: Graphics;
    boundingBoxesPolygon: Graphics;
    pathsCurve: Graphics;
    pathsLine: Graphics;
    parentDebugContainer: Container;
}

/**
 * This is a debug renderer that uses PixiJS Graphics under the hood.
 * @public
 */
export class SpineDebugRenderer implements ISpineDebugRenderer {
    private registeredSpines:Map<SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, DebugDisplayObjects> = new Map();

    public drawDebug: boolean = true;
    public drawMeshHull: boolean = true;
    public drawMeshTriangles: boolean = true;
    public drawBones: boolean = true;
    public drawPaths: boolean = true;
    public drawBoundingBoxes: boolean = true;
    public drawClipping: boolean = true;
    public drawRegionAttachments: boolean = true;

    public lineWidth: number =  1;
    public regionAttachmentsColor: number =  0x0078ff;
    public meshHullColor: number =  0x0078ff;
    public meshTrianglesColor: number =  0xffcc00;
    public clippingPolygonColor: number =  0xff00ff;
    public boundingBoxesRectColor: number =  0x00ff00;
    public boundingBoxesPolygonColor: number =  0x00ff00;
    public boundingBoxesCircleColor: number =  0x00ff00;
    public pathsCurveColor: number =  0xff0000;
    public pathsLineColor: number =  0xff00ff;
    public skeletonXYColor:number = 0xff0000;
    public bonesColor:number = 0x00eecc;

    /**
     * The debug is attached by force to each spine object. So we need to create it inside the spine when we get the first update
     */
    public registerSpine(spine: SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>) {
        if (this.registeredSpines.has(spine))
        {
            console.warn("SpineDebugRenderer.registerSpine() - this spine is already registered!", spine);
        }
        const debugDisplayObjects = {
            parentDebugContainer: new Container(),
            bones: new Container(),
            skeletonXY: new Graphics(),
            regionAttachmentsShape: new Graphics(),
            meshTrianglesLine: new Graphics(),
            meshHullLine: new Graphics(),
            clippingPolygon: new Graphics(),
            boundingBoxesRect: new Graphics(),
            boundingBoxesCircle: new Graphics(),
            boundingBoxesPolygon: new Graphics(),
            pathsCurve: new Graphics(),
            pathsLine: new Graphics(),
        };
        
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.bones);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.skeletonXY);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.regionAttachmentsShape);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.meshTrianglesLine);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.meshHullLine);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.clippingPolygon);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.boundingBoxesRect);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.boundingBoxesCircle);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.boundingBoxesPolygon);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.pathsCurve);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.pathsLine);

        spine.addChild(debugDisplayObjects.parentDebugContainer);

        this.registeredSpines.set(spine, debugDisplayObjects);
    }
    public renderDebug(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>):void {

        if (!this.registeredSpines.has(spine)) {
            // This should never happen. Spines are registered when you assign spine.debug
            this.registerSpine(spine);
        }

        const debugDisplayObjects = this.registeredSpines.get(spine);

        debugDisplayObjects.skeletonXY.clear();
        debugDisplayObjects.regionAttachmentsShape.clear();
        debugDisplayObjects.meshTrianglesLine.clear();
        debugDisplayObjects.meshHullLine.clear();
        debugDisplayObjects.clippingPolygon.clear();
        debugDisplayObjects.boundingBoxesRect.clear();
        debugDisplayObjects.boundingBoxesCircle.clear();
        debugDisplayObjects.boundingBoxesPolygon.clear();
        debugDisplayObjects.pathsCurve.clear();
        debugDisplayObjects.pathsLine.clear();

        for (let len = debugDisplayObjects.bones.children.length; len > 0; len--) {
            debugDisplayObjects.bones.children[len - 1].destroy({ children: true, texture: true, baseTexture: true });
        }

        const scale = spine.scale.x || spine.scale.y || 1;
        const lineWidth = this.lineWidth / scale;

        if (this.drawBones) {
            this.drawBonesFunc(spine, debugDisplayObjects, lineWidth, scale);
        }

        if (this.drawPaths) {
            this.drawPathsFunc(spine, debugDisplayObjects, lineWidth);
        }

        if (this.drawBoundingBoxes) {
            this.drawBoundingBoxesFunc(spine, debugDisplayObjects, lineWidth);
        }

        if (this.drawClipping) {
            this.drawClippingFunc(spine, debugDisplayObjects, lineWidth);
        }

        if (this.drawMeshHull || this.drawMeshTriangles) {
            this.drawMeshHullAndMeshTriangles(spine, debugDisplayObjects, lineWidth);
        }

        if (this.drawRegionAttachments) {
            this.drawRegionAttachmentsFunc(spine, debugDisplayObjects, lineWidth);
        }
    }
    
    private drawBonesFunc(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, debugDisplayObjects: DebugDisplayObjects, lineWidth:number, scale:number): void {
        const skeleton = spine.skeleton;
        const skeletonX = skeleton.x;
        const skeletonY = skeleton.y;
        const bones = skeleton.bones;

        debugDisplayObjects.skeletonXY.lineStyle(lineWidth, this.skeletonXYColor, 1);

        for (let i = 0, len = bones.length; i < len; i++) {
            const bone = bones[i],
                boneLen = bone.data.length,
                starX = skeletonX + bone.matrix.tx,
                starY = skeletonY + bone.matrix.ty,
                endX = skeletonX + boneLen * bone.matrix.a + bone.matrix.tx,
                endY = skeletonY + boneLen * bone.matrix.b + bone.matrix.ty;

            if (bone.data.name === "root" || bone.data.parent === null) {
                continue;
            }

            // Triangle calculation formula
            // area: A=sqrt((a+b+c)*(-a+b+c)*(a-b+c)*(a+b-c))/4
            // alpha: alpha=acos((pow(b, 2)+pow(c, 2)-pow(a, 2))/(2*b*c))
            // beta: beta=acos((pow(a, 2)+pow(c, 2)-pow(b, 2))/(2*a*c))
            // gamma: gamma=acos((pow(a, 2)+pow(b, 2)-pow(c, 2))/(2*a*b))

            const w = Math.abs(starX - endX),
                h = Math.abs(starY - endY),
                // a = w, // side length a
                a2 = Math.pow(w, 2), // square root of side length a
                b = h, // side length b
                b2 = Math.pow(h, 2), // square root of side length b
                c = Math.sqrt(a2 + b2), // side length c
                c2 = Math.pow(c, 2), // square root of side length c
                rad = Math.PI / 180,
                // A = Math.acos([a2 + c2 - b2] / [2 * a * c]) || 0, // Angle A
                // C = Math.acos([a2 + b2 - c2] / [2 * a * b]) || 0, // C angle
                B = Math.acos((c2 + b2 - a2) / (2 * b * c)) || 0; // angle of corner B
            if (c === 0) {
                continue;
            }

            const gp = new Graphics();
            debugDisplayObjects.bones.addChild(gp);

            // draw bone
            const refRation = c / 50 / scale;
            gp.beginFill(this.bonesColor, 1);
            gp.drawPolygon(0, 0, 0 - refRation, c - refRation * 3, 0, c - refRation, 0 + refRation, c - refRation * 3);
            gp.endFill();
            gp.x = starX;
            gp.y = starY;
            gp.pivot.y = c;

            // Calculate bone rotation angle
            let rotation = 0;
            if (starX < endX && starY < endY) {
                // bottom right
                rotation = -B + 180 * rad;
            } else if (starX > endX && starY < endY) {
                // bottom left
                rotation = 180 * rad + B;
            } else if (starX > endX && starY > endY) {
                // top left
                rotation = -B;
            } else if (starX < endX && starY > endY) {
                // bottom left
                rotation = B;
            } else if (starY === endY && starX < endX) {
                // To the right
                rotation = 90 * rad;
            } else if (starY === endY && starX > endX) {
                // go left
                rotation = -90 * rad;
            } else if (starX === endX && starY < endY) {
                // down
                rotation = 180 * rad;
            } else if (starX === endX && starY > endY) {
                // up
                rotation = 0;
            }
            gp.rotation = rotation;

            // Draw the starting rotation point of the bone
            gp.lineStyle(lineWidth + refRation / 2.4, this.bonesColor, 1);
            gp.beginFill(0x000000, 0.6);
            gp.drawCircle(0, c, refRation * 1.2);
            gp.endFill();
        }

        // Draw the skeleton starting point "X" form
        const startDotSize = lineWidth * 3;
        debugDisplayObjects.skeletonXY.moveTo(skeletonX - startDotSize, skeletonY - startDotSize);
        debugDisplayObjects.skeletonXY.lineTo(skeletonX + startDotSize, skeletonY + startDotSize);
        debugDisplayObjects.skeletonXY.moveTo(skeletonX + startDotSize, skeletonY - startDotSize);
        debugDisplayObjects.skeletonXY.lineTo(skeletonX - startDotSize, skeletonY + startDotSize);
    }

    private drawRegionAttachmentsFunc(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, debugDisplayObjects: DebugDisplayObjects, lineWidth:number): void {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;

        debugDisplayObjects.regionAttachmentsShape.lineStyle(lineWidth, this.regionAttachmentsColor, 1);

        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i],
                attachment = slot.getAttachment();
            if (attachment == null || attachment.type !== AttachmentType.Region) {
                continue;
            }

            const regionAttachment = attachment as IRegionAttachment & {
                computeWorldVertices:(slot: unknown, worldVertices: unknown, offset: unknown, stride: unknown) => void,
                updateOffset?:() => void,
            };

            const vertices = new Float32Array(8);


            regionAttachment?.updateOffset(); // We don't need this on all versions

            regionAttachment.computeWorldVertices(slot, vertices, 0, 2);
            debugDisplayObjects.regionAttachmentsShape.drawPolygon(Array.from(vertices.slice(0, 8)));
            
        }
    }

    private drawMeshHullAndMeshTriangles(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, debugDisplayObjects: DebugDisplayObjects, lineWidth:number): void {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;

        debugDisplayObjects.meshHullLine.lineStyle(lineWidth, this.meshHullColor, 1);
        debugDisplayObjects.meshTrianglesLine.lineStyle(lineWidth, this.meshTrianglesColor, 1);

        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            if (!slot.bone.active) {
                continue;
            }
            const attachment = slot.getAttachment();
            if (attachment == null || attachment.type !== AttachmentType.Mesh) {
                continue;
            }

            const meshAttachment:IMeshAttachment = attachment as IMeshAttachment;

            const vertices = new Float32Array(meshAttachment.worldVerticesLength),
                triangles = meshAttachment.triangles;
            let hullLength = meshAttachment.hullLength;
            meshAttachment.computeWorldVertices(slot, 0, meshAttachment.worldVerticesLength, vertices, 0, 2);
            // draw the skinned mesh (triangle)
            if (this.drawMeshTriangles) {
                for (let i = 0, len = triangles.length; i < len; i += 3) {
                    const v1 = triangles[i] * 2,
                        v2 = triangles[i + 1] * 2,
                        v3 = triangles[i + 2] * 2;
                    debugDisplayObjects.meshTrianglesLine.moveTo(vertices[v1], vertices[v1 + 1]);
                    debugDisplayObjects.meshTrianglesLine.lineTo(vertices[v2], vertices[v2 + 1]);
                    debugDisplayObjects.meshTrianglesLine.lineTo(vertices[v3], vertices[v3 + 1]);
                }
            }

            // draw skin border
            if (this.drawMeshHull && hullLength > 0) {
                hullLength = (hullLength >> 1) * 2;
                let lastX = vertices[hullLength - 2],
                    lastY = vertices[hullLength - 1];
                for (let i = 0, len = hullLength; i < len; i += 2) {
                    const x = vertices[i],
                        y = vertices[i + 1];
                    debugDisplayObjects.meshHullLine.moveTo(x, y);
                    debugDisplayObjects.meshHullLine.lineTo(lastX, lastY);
                    lastX = x;
                    lastY = y;
                }
            }
        }
    }

    private drawClippingFunc(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, debugDisplayObjects: DebugDisplayObjects, lineWidth:number): void {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;

        debugDisplayObjects.clippingPolygon.lineStyle(lineWidth, this.clippingPolygonColor, 1);
        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            if (!slot.bone.active) {
                continue;
            }
            const attachment = slot.getAttachment();
            if (attachment == null || attachment.type !== AttachmentType.Clipping) {
                continue;
            }

            const clippingAttachment: IClippingAttachment = attachment as IClippingAttachment;

            const nn = clippingAttachment.worldVerticesLength,
                world = new Float32Array(nn);
            clippingAttachment.computeWorldVertices(slot, 0, nn, world, 0, 2);
            debugDisplayObjects.clippingPolygon.drawPolygon(Array.from(world));
        }
    }

    private drawBoundingBoxesFunc(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, debugDisplayObjects: DebugDisplayObjects, lineWidth:number): void {
        // draw the total outline of the bounding box
        debugDisplayObjects.boundingBoxesRect.lineStyle(lineWidth, this.boundingBoxesRectColor, 5);

        const bounds = new SkeletonBoundsBase();
        bounds.update(spine.skeleton, true);
        debugDisplayObjects.boundingBoxesRect.drawRect(bounds.minX, bounds.minY, bounds.getWidth(), bounds.getHeight());

        const polygons = bounds.polygons,
            drawPolygon = (polygonVertices: ArrayLike<number>, _offset: unknown, count: number): void => {
                debugDisplayObjects.boundingBoxesPolygon.lineStyle(lineWidth, this.boundingBoxesPolygonColor, 1);
                debugDisplayObjects.boundingBoxesPolygon.beginFill(this.boundingBoxesPolygonColor, 0.1);

                if (count < 3) {
                    throw new Error("Polygon must contain at least 3 vertices");
                }
                const paths = [],
                    dotSize = lineWidth * 2;
                for (let i = 0, len = polygonVertices.length; i < len; i += 2) {
                    const x1 = polygonVertices[i],
                        y1 = polygonVertices[i + 1];

                    // draw the bounding box node
                    debugDisplayObjects.boundingBoxesCircle.lineStyle(0);
                    debugDisplayObjects.boundingBoxesCircle.beginFill(this.boundingBoxesCircleColor);
                    debugDisplayObjects.boundingBoxesCircle.drawCircle(x1, y1, dotSize);
                    debugDisplayObjects.boundingBoxesCircle.endFill();

                    paths.push(x1, y1);
                }

                // draw the bounding box area
                debugDisplayObjects.boundingBoxesPolygon.drawPolygon(paths);
                debugDisplayObjects.boundingBoxesPolygon.endFill();
            };

        for (let i = 0, len = polygons.length; i < len; i++) {
            const polygon = polygons[i];
            drawPolygon(polygon, 0, polygon.length);
        }
    }

    private drawPathsFunc(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>, debugDisplayObjects: DebugDisplayObjects, lineWidth:number): void {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;

        debugDisplayObjects.pathsCurve.lineStyle(lineWidth, this.pathsCurveColor, 1);
        debugDisplayObjects.pathsLine.lineStyle(lineWidth, this.pathsLineColor, 1);

        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            if (!slot.bone.active) {
                continue;
            }
            const attachment = slot.getAttachment();
            if (attachment == null || attachment.type !== AttachmentType.Path) {
                continue
            }

            const pathAttachment = attachment as IVertexAttachment & {closed:boolean};
            let nn = pathAttachment.worldVerticesLength;
            const world = new Float32Array(nn);
            pathAttachment.computeWorldVertices(slot, 0, nn, world, 0, 2);
            let x1 = world[2],
                y1 = world[3],
                x2 = 0,
                y2 = 0;
            if (pathAttachment.closed) {
                const cx1 = world[0],
                    cy1 = world[1],
                    cx2 = world[nn - 2],
                    cy2 = world[nn - 1];
                x2 = world[nn - 4];
                y2 = world[nn - 3];

                // curve
                debugDisplayObjects.pathsCurve.moveTo(x1, y1);
                debugDisplayObjects.pathsCurve.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);

                // handle
                debugDisplayObjects.pathsLine.moveTo(x1, y1);
                debugDisplayObjects.pathsLine.lineTo(cx1, cy1);
                debugDisplayObjects.pathsLine.moveTo(x2, y2);
                debugDisplayObjects.pathsLine.lineTo(cx2, cy2);
            }
            nn -= 4;
            for (let ii = 4; ii < nn; ii += 6) {
                const cx1 = world[ii],
                    cy1 = world[ii + 1],
                    cx2 = world[ii + 2],
                    cy2 = world[ii + 3];
                x2 = world[ii + 4];
                y2 = world[ii + 5];
                // curve
                debugDisplayObjects.pathsCurve.moveTo(x1, y1);
                debugDisplayObjects.pathsCurve.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);

                // handle
                debugDisplayObjects.pathsLine.moveTo(x1, y1);
                debugDisplayObjects.pathsLine.lineTo(cx1, cy1);
                debugDisplayObjects.pathsLine.moveTo(x2, y2);
                debugDisplayObjects.pathsLine.lineTo(cx2, cy2);
                x1 = x2;
                y1 = y2;
            }
        }
    }

    public unregisterSpine(spine:SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData>):void{
        if (!this.registeredSpines.has(spine)) {
            console.warn("SpineDebugRenderer.unregisterSpine() - spine is not registered, can't unregister!", spine);
        }
        const debugDisplayObjects = this.registeredSpines.get(spine);
        debugDisplayObjects.parentDebugContainer.destroy({baseTexture:true, children:true, texture:true});
        this.registeredSpines.delete(spine);
    }
}