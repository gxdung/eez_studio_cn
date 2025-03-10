import { objectClone } from "eez-studio-shared/util";
import { Rect } from "eez-studio-shared/geometry";
import { TreeObjectAdapter } from "project-editor/core/objectAdapter";
import { IEezObject, MessageType } from "project-editor/core/object";
import {
    //createObject,
    propertyNotFoundMessage,
    Section
} from "project-editor/store";
import type { BuildResult } from "project-editor/store/features";
import { getProjectStore } from "project-editor/store";

import { isArray } from "eez-studio-shared/util";

import {
    TAB,
    NamingConvention,
    getName,
    dumpData
} from "project-editor/build/helper";
import {
    Project,
    BuildConfiguration,
    getProject
} from "project-editor/project/project";

import {
    getBitmapDataAsync,
    BitmapData,
    Bitmap
} from "project-editor/features/bitmap/bitmap";
import { Font } from "project-editor/features/font/font";
import { Style } from "project-editor/features/style/style";
import { Page /*, PageOrientation*/ } from "project-editor/features/page/page";
import { Widget, Component } from "project-editor/flow/component";

import {
    ContainerWidget,
    UserWidgetWidget,
    ListWidget,
    SelectWidget
} from "project-editor/flow/components/widgets";
import {
    BitmapWidget,
    RectangleWidget,
    TextWidget,
    BarGraphWidget,
    DisplayDataWidget,
    ListGraphWidget,
    MultilineTextWidget,
    ToggleButtonWidget,
    UpDownWidget,
    YTGraphWidget,
    ButtonWidget
} from "project-editor/flow/components/widgets/eez-gui";

////////////////////////////////////////////////////////////////////////////////

const STYLE_FLAGS_BORDER = 1 << 0;
const STYLE_FLAGS_HORZ_ALIGN_LEFT = 0 << 1;
const STYLE_FLAGS_HORZ_ALIGN_RIGHT = 1 << 1;
const STYLE_FLAGS_HORZ_ALIGN_CENTER = 2 << 1;
const STYLE_FLAGS_VERT_ALIGN_TOP = 0 << 3;
const STYLE_FLAGS_VERT_ALIGN_BOTTOM = 1 << 3;
const STYLE_FLAGS_VERT_ALIGN_CENTER = 2 << 3;
const STYLE_FLAGS_BLINK = 1 << 5;

const WIDGET_TYPE_NONE = 0;
const WIDGET_TYPE_CONTAINER = 1;
const WIDGET_TYPE_LIST = 2;
const WIDGET_TYPE_SELECT = 3;
const WIDGET_TYPE_DISPLAY_DATA = 4;
const WIDGET_TYPE_TEXT = 5;
const WIDGET_TYPE_MULTILINE_TEXT = 6;
const WIDGET_TYPE_RECTANGLE = 7;
const WIDGET_TYPE_BITMAP = 8;
const WIDGET_TYPE_BUTTON = 9;
const WIDGET_TYPE_TOGGLE_BUTTON = 10;
const WIDGET_TYPE_BUTTON_GROUP = 11;
const WIDGET_TYPE_BAR_GRAPH = 13;
const WIDGET_TYPE_CUSTOM = 14;
const WIDGET_TYPE_YT_GRAPH = 15;
const WIDGET_TYPE_UP_DOWN = 16;
const WIDGET_TYPE_LIST_GRAPH = 17;

const LIST_TYPE_VERTICAL = 1;
const LIST_TYPE_HORIZONTAL = 2;

const BAR_GRAPH_ORIENTATION_LEFT_RIGHT = 1;
const BAR_GRAPH_ORIENTATION_RIGHT_LEFT = 2;
const BAR_GRAPH_ORIENTATION_TOP_BOTTOM = 3;
const BAR_GRAPH_ORIENTATION_BOTTOM_TOP = 4;

////////////////////////////////////////////////////////////////////////////////

// Workaround for the "!!!" bug in Arduino Mega bootloader program. Three
// consecutive "!"" characters causes the bootloader to jump into a 'monitor mode'
// awaiting user monitor commands (which will never come) thus hanging the up load operation.
// If hex image contains three consecutive '!' characters (33 is ASCII code)
// then uploading hex image to the device will fail.
// Here we replace "!!!"" with "!! ", i.e. [33, 33, 33] with [33, 33, 32].
function fixDataForMegaBootloader(
    data: number[] | Uint8Array,
    object: IEezObject
) {
    let result: number[] = [];

    let threeExclamationsDetected = false;

    for (let i = 0; i < data.length; i++) {
        if (i >= 2 && data[i - 2] == 33 && data[i - 1] == 33 && data[i] == 33) {
            threeExclamationsDetected = true;
            result.push(32);
        } else {
            result.push(data[i]);
        }
    }

    if (threeExclamationsDetected) {
        //outputSectionsStore.write(Section.OUTPUT, Type.WARNING, `"!!!" detected and replaced with "!! " (Arduino Mega bootloader bug)`, object);
    }

    return result;
}

////////////////////////////////////////////////////////////////////////////////

type DisplayItemChildrenArray = DisplayItem[];
type DisplayItemChildrenObject = { [key: string]: DisplayItem };
type DisplayItemChildren = DisplayItemChildrenArray | DisplayItemChildrenObject;

interface DisplayItem {
    object: IEezObject;
    selected: boolean;
    children: DisplayItemChildren;
}

interface TreeNode {
    parent: TreeNode;
    children: TreeNode[];

    rect: Rect;

    item: DisplayItem;
    custom?: any;
    isOpaque?: boolean;
}

enum TraverseTreeContinuation {
    CONTINUE,
    SKIP_CHILDREN,
    BREAK
}

function traverseTree(
    node: TreeNode,
    callback: (node: TreeNode) => TraverseTreeContinuation | void
) {
    let result = callback(node);
    if (result == undefined || result === TraverseTreeContinuation.CONTINUE) {
        for (let i = 0; i < node.children.length; i++) {
            if (
                traverseTree(node.children[i], callback) ==
                TraverseTreeContinuation.BREAK
            ) {
                return TraverseTreeContinuation.BREAK;
            }
        }
    }

    return result;
}

function isWidgetOpaque(widgetObj: Component) {
    return !(
        widgetObj.type === "Container" ||
        widgetObj.type === "List" ||
        widgetObj.type === "Select"
    );
}

function getSelectedWidgetForSelectWidget(
    flowContainerDisplayItem: DisplayItem,
    item: DisplayItem
): DisplayItem | undefined {
    let widget = item.object as SelectWidget;
    if (widget.data && widget.widgets) {
        let index: number = getProjectStore(
            flowContainerDisplayItem.object
        ).dataContext.getEnumValue(widget.data);
        if (index >= 0 && index < widget.widgets.length) {
            let widgetsItemChildren = item.children as DisplayItemChildrenArray;

            return widgetsItemChildren[index];
        }
    }
    return undefined;
}

function createWidgetTree(widgetContainer: IEezObject, draw: boolean) {
    function enumWidgets(flowContainerDisplayItem: DisplayItem) {
        function enumWidget(
            parentNode: TreeNode | undefined,
            item: DisplayItem,
            x: number,
            y: number
        ) {
            let object = item.object as Component | Page;

            x += object.left || 0;
            y += object.top || 0;

            let rect = {
                left: x,
                top: y,
                width: object.width,
                height: object.height
            };

            let treeNode: TreeNode = {
                parent: parentNode as TreeNode,
                children: [],
                rect: rect,
                item: item,
                isOpaque: object instanceof Component && isWidgetOpaque(object)
            };

            if (parentNode) {
                parentNode.children.push(treeNode);
            }

            if (!(object instanceof Component)) {
                let widgetsItemChildren = item.children;

                if (!isArray(widgetsItemChildren)) {
                    widgetsItemChildren =
                        widgetsItemChildren["widgets"].children;
                }

                (widgetsItemChildren as DisplayItemChildrenArray).forEach(
                    child => {
                        enumWidget(treeNode, child, x, y);
                    }
                );
            } else {
                if (object.type == "Container") {
                    let widgetsItemChildren =
                        item.children as DisplayItemChildrenArray;
                    widgetsItemChildren.forEach(child => {
                        enumWidget(treeNode, child, x, y);
                    });
                } else if (object.type == "List") {
                    let widget = object as ListWidget;
                    let itemWidget = widget.itemWidget;
                    if (itemWidget) {
                        let itemWidgetItem = (
                            item.children as DisplayItemChildrenObject
                        )["itemWidget"];

                        const dataValue = getProjectStore(
                            flowContainerDisplayItem.object
                        ).dataContext.get(widget.data as string);
                        if (dataValue && isArray(dataValue)) {
                            for (let i = 0; i < dataValue.length; i++) {
                                enumWidget(treeNode, itemWidgetItem, x, y);

                                if (widget.listType == "vertical") {
                                    y += itemWidget.height;
                                } else {
                                    x += itemWidget.width;
                                }
                            }
                        }
                    }
                } else if (object.type == "Select") {
                    let selectedWidgetItem = getSelectedWidgetForSelectWidget(
                        flowContainerDisplayItem,
                        item
                    );
                    if (selectedWidgetItem) {
                        enumWidget(treeNode, selectedWidgetItem, x, y);
                    }
                }
            }

            return treeNode;
        }

        return enumWidget(undefined, flowContainerDisplayItem, 0, 0);
    }

    return enumWidgets(new TreeObjectAdapter(widgetContainer));
}

////////////////////////////////////////////////////////////////////////////////

class PageTransparencyGrid {
    cols: {
        x: number;
        width: number;
        rows: {
            y: number;
            height: number;
            opaque: boolean;
        }[];
    }[];

    constructor(rect: Rect) {
        this.cols = [
            {
                x: rect.left,
                width: rect.width,
                rows: [
                    {
                        y: rect.top,
                        height: rect.height,
                        opaque: false
                    }
                ]
            }
        ];
    }

    private addCol(x: number) {
        for (let iCol = 0; iCol < this.cols.length; iCol++) {
            let col = this.cols[iCol];

            if (x <= col.x) {
                return;
            }

            if (x < col.x + col.width) {
                let newCol = objectClone(col);

                newCol.x = x;
                newCol.width = col.x + col.width - x;

                col.width = x - col.x;

                this.cols.splice(iCol + 1, 0, newCol);

                return;
            }
        }
    }

    private addRow(y: number) {
        for (let iCol = 0; iCol < this.cols.length; iCol++) {
            let col = this.cols[iCol];

            for (let iRow = 0; iRow < col.rows.length; iRow++) {
                let row = col.rows[iRow];

                if (y <= row.y) {
                    break;
                }

                if (y < row.y + row.height) {
                    let newRow = objectClone(row);

                    newRow.y = y;
                    newRow.height = row.y + row.height - y;

                    row.height = y - row.y;

                    col.rows.splice(iRow + 1, 0, newRow);

                    break;
                }
            }
        }
    }

    private addRect(rect: Rect) {
        this.addCol(rect.left);
        this.addCol(rect.left + rect.width);
        this.addRow(rect.top);
        this.addRow(rect.top + rect.height);
    }

    addOpaqueRect(rect: Rect) {
        if (rect.width > 0 || rect.height > 0) {
            this.addRect(rect);

            // mark as opaque
            for (let iCol = 0; iCol < this.cols.length; iCol++) {
                let col = this.cols[iCol];
                if (
                    col.x >= rect.left &&
                    col.x + col.width <= rect.left + rect.width
                ) {
                    for (let iRow = 0; iRow < col.rows.length; iRow++) {
                        let row = col.rows[iRow];
                        if (
                            row.y >= rect.top &&
                            row.y + row.height <= rect.top + rect.height
                        ) {
                            row.opaque = true;
                        }
                    }
                }
            }
        }
    }

    getMaxRectAtCell(iColStart: number, iRowStart: number): Rect {
        let colStart = this.cols[iColStart];

        let iColEnd: number;
        for (iColEnd = iColStart + 1; iColEnd < this.cols.length; iColEnd++) {
            let row = this.cols[iColEnd].rows[iRowStart];
            if (row.opaque) {
                break;
            }
            row.opaque = true;
        }
        iColEnd--;
        let colEnd = this.cols[iColEnd];

        let rowStart = colStart.rows[iRowStart];

        let iRowEnd: number;
        for (
            iRowEnd = iRowStart + 1;
            iRowEnd < colStart.rows.length;
            iRowEnd++
        ) {
            let opaque = false;

            for (let iCol = iColStart; iCol <= iColEnd; iCol++) {
                if (this.cols[iCol].rows[iRowEnd].opaque) {
                    opaque = true;
                    break;
                }
            }

            if (opaque) {
                break;
            }

            for (let iCol = iColStart; iCol <= iColEnd; iCol++) {
                this.cols[iCol].rows[iRowEnd].opaque = true;
            }
        }
        iRowEnd--;
        let rowEnd = colEnd.rows[iRowEnd];

        return {
            left: colStart.x,
            top: rowStart.y,
            width: colEnd.x + colEnd.width - colStart.x,
            height: rowEnd.y + rowEnd.height - rowStart.y
        };
    }

    getTransparentRectangles(): Rect[] {
        let rects: Rect[] = [];

        for (let iCol = 0; iCol < this.cols.length; iCol++) {
            let col = this.cols[iCol];
            for (let iRow = 0; iRow < col.rows.length; iRow++) {
                let row = col.rows[iRow];
                if (!row.opaque) {
                    let rect = this.getMaxRectAtCell(iCol, iRow);
                    rects.push(rect);
                }
            }
        }

        return rects;
    }
}

function findPageTransparentRectanglesInTree(tree: TreeNode): Rect[] {
    let grid = new PageTransparencyGrid(tree.rect);

    traverseTree(tree, node => {
        if (node.isOpaque) {
            grid.addOpaqueRect(node.rect);
        }
    });

    return grid.getTransparentRectangles();
}

function findPageTransparentRectanglesInContainer(container: IEezObject) {
    return findPageTransparentRectanglesInTree(
        createWidgetTree(container, false)
    );
}

////////////////////////////////////////////////////////////////////////////////

function getItem(
    items: {
        name: string;
    }[],
    object: any,
    propertyName: string
) {
    const itemName = object[propertyName];

    for (let i = 0; i < items.length; i++) {
        if (items[i].name === itemName) {
            if (++i > 255) {
                return 0;
            }
            return i;
        }
    }

    const message = propertyNotFoundMessage(object, propertyName);
    getProjectStore(object).outputSectionsStore.write(
        Section.OUTPUT,
        message.type,
        message.text,
        message.object
    );

    return 0;
}

function getPageLayoutIndex(object: any, propertyName: string) {
    const pages = getProject(object).pages.filter(
        page => page.isUsedAsUserWidget
    );
    return getItem(pages, object, propertyName);
}

function getGlobalVariableIndex(object: any, propertyName: string) {
    const globalVariables = getProject(object).variables.globalVariables;
    return getItem(globalVariables, object, propertyName);
}

function getActionIndex(object: any, propertyName: string) {
    const actions = getProject(object).actions;
    return getItem(actions, object, propertyName);
}

function getBitmapIndex(object: any, propertyName: string) {
    const bitmaps = getProject(object).bitmaps;
    return getItem(bitmaps, object, propertyName);
}

function getFontIndex(object: any, propertyName: string) {
    const fonts = getProject(object).fonts;
    return getItem(fonts, object, propertyName);
}

function getStyleIndex(object: any, propertyName: string) {
    const styles = getProject(object).allStyles;

    let itemName = object[propertyName];
    if (itemName.parentStyle) {
        itemName = itemName.parentStyle.name;
    }

    for (let i = 0; i < styles.length; i++) {
        if (styles[i].name === itemName) {
            if (++i > 255) {
                return 0;
            }
            return i;
        }
    }

    const message = propertyNotFoundMessage(object, propertyName);
    getProjectStore(object).outputSectionsStore.write(
        Section.OUTPUT,
        message.type,
        message.text,
        message.object
    );

    return 0;
}

function getDefaultStyleIndex(object: IEezObject) {
    const styles = getProject(object).allStyles;
    for (let i = 0; i < styles.length; i++) {
        if (styles[i].name === "default") {
            if (++i > 255) {
                return 0;
            }
            return i;
        }
    }
    return 0;
}

////////////////////////////////////////////////////////////////////////////////

function buildWidgetText(text: string) {
    try {
        return JSON.parse('"' + text + '"');
    } catch (e) {}
    return text;
}

////////////////////////////////////////////////////////////////////////////////

function buildGuiFontsEnum(project: Project) {
    let fonts = project.fonts.map(
        font =>
            `${TAB}${getName(
                "FONT_ID_",
                font,
                NamingConvention.UnderscoreUpperCase
            )}`
    );

    // TODO what if font name is none!?
    fonts.unshift(`${TAB}FONT_ID_NONE`);

    return `enum FontsEnum {\n${fonts.join(",\n")}\n};`;
}

function buildGuiFontsDecl(project: Project) {
    return `extern const uint8_t *fonts[];`;
}

export function getFontData(font: Font) {
    /*
    Font header:

    offset
    0           ascent              uint8
    1           descent             uint8
    2           encoding start      uint8
    3           encoding end        uint8
    4           1st encoding offset uint16 BE (1 bpp) | uint32 LE (8 bpp)
    6           2nd encoding offset uint16 BE (1 bpp) | uint32 LE (8 bpp)
    ...
    */

    /*
    Glyph header:

    offset
    0             DWIDTH                    int8
    1             BBX width                 uint8
    2             BBX height                uint8
    3             BBX xoffset               int8
    4             BBX yoffset               int8

    Note: byte 0 == 255 indicates empty glyph
    */

    const min = Math.min(...font.glyphs.map(g => g.encoding));
    const startEncoding = Number.isFinite(min) ? min : 32;
    const max = Math.max(...font.glyphs.map(g => g.encoding));
    const endEncoding = Number.isFinite(max) ? max : 127;

    const data: number[] = [];

    function add(...values: number[]) {
        for (const value of values) {
            if (value < 0) {
                data.push(256 + value);
            } else {
                data.push(value);
            }
        }
    }

    if (startEncoding <= endEncoding) {
        add(font.ascent);
        add(font.descent);
        add(startEncoding);
        add(endEncoding);

        for (let i = startEncoding; i <= endEncoding; i++) {
            if (font.bpp === 8) {
                add(0);
                add(0);
                add(0);
                add(0);
            } else {
                add(0);
                add(0);
            }
        }

        for (let i = startEncoding; i <= endEncoding; i++) {
            const offsetIndex =
                4 + (i - startEncoding) * (font.bpp === 8 ? 4 : 2);
            const offset = data.length;
            if (font.bpp === 8) {
                // uint32 LE
                data[offsetIndex + 0] = offset & 0xff;
                data[offsetIndex + 1] = (offset >> 8) & 0xff;
                data[offsetIndex + 2] = (offset >> 16) & 0xff;
                data[offsetIndex + 3] = offset >> 24;
            } else {
                // uint16 BE
                data[offsetIndex + 0] = offset >> 8;
                data[offsetIndex + 1] = offset & 0xff;
            }

            let glyph = font.glyphs.find(glyph => glyph.encoding == i);

            if (glyph && glyph.pixelArray) {
                add(glyph.dx);
                add(glyph.width);
                add(glyph.height);
                add(glyph.x);
                add(glyph.y);

                add(...glyph.pixelArray);
            } else {
                add(255);
            }
        }
    }

    return data;
}

function buildGuiFontsDef(project: Project) {
    let fontItemDataList: string[] = [];
    let fontItemList: string[] = [];

    project.fonts.forEach(font => {
        let fontItemDataName = getName(
            "font_data_",
            font,
            NamingConvention.UnderscoreLowerCase
        );

        let data = fixDataForMegaBootloader(getFontData(font), font);

        let fontItemData = `const uint8_t ${fontItemDataName}[${
            data.length
        }] = {${dumpData(data)}};`;
        if (font.screenOrientation != "all") {
            let orientation = font.screenOrientation.toUpperCase();
            fontItemData = `#if DISPLAY_ORIENTATION == DISPLAY_ORIENTATION_${orientation}\n${fontItemData}\n#endif`;
        }
        fontItemDataList.push(fontItemData);

        let fontItem = `${TAB}${fontItemDataName},`;
        if (font.screenOrientation != "all") {
            let orientation = font.screenOrientation.toUpperCase();
            fontItem = `#if DISPLAY_ORIENTATION == DISPLAY_ORIENTATION_${orientation}\n${fontItem}\n#else\n${TAB}0,\n#endif`;
        }
        fontItemList.push(fontItem);
    });

    return `// FONT DEFINITIONS\n\n${fontItemDataList.join(
        "\n\n"
    )}\n\nconst uint8_t *fonts[] = {\n${fontItemList.join("\n")}\n};`;
}

////////////////////////////////////////////////////////////////////////////////

function buildGuiBitmapsEnum(project: Project) {
    let bitmaps = project.bitmaps.map(
        bitmap =>
            `${TAB}${getName(
                "BITMAP_ID_",
                bitmap,
                NamingConvention.UnderscoreUpperCase
            )}`
    );

    bitmaps.unshift(`${TAB}BITMAP_ID_NONE`);

    return `enum BitmapsEnum {\n${bitmaps.join(",\n")}\n};`;
}

function buildGuiBitmapsDecl(project: Project) {
    return `struct Bitmap {
            uint16_t w;
            uint16_t h;
            const uint8_t *pixels;
        };

        extern Bitmap bitmaps[];`.replace(/\n        /g, "\n");
}

function buildGuiBitmapsDef(project: Project) {
    return new Promise<string>((resolve, reject) => {
        if (project.bitmaps.length === 0) {
            resolve(`Bitmap bitmaps[] = {
    { 0, 0, NULL }
};`);
            return;
        }

        let getBitmapDataPromises: Promise<BitmapData>[] = [];
        for (let i = 0; i < project.bitmaps.length; i++) {
            getBitmapDataPromises.push(getBitmapDataAsync(project.bitmaps[i]));
        }

        Promise.all(getBitmapDataPromises).then(bitmapsData => {
            let bitmapsPixelData: string[] = [];
            let bitmapsArray: string[] = [];

            let bitmaps: {
                bitmap: Bitmap;
                name: string;
                width: number;
                height: number;
                pixels: number[];
            }[] = [];
            for (let i = 0; i < project.bitmaps.length; i++) {
                bitmaps.push({
                    bitmap: project.bitmaps[i],
                    name: project.bitmaps[i].name,
                    width: bitmapsData[i].width,
                    height: bitmapsData[i].height,
                    pixels: fixDataForMegaBootloader(
                        bitmapsData[i].pixels,
                        project.bitmaps[i]
                    )
                });
            }

            bitmaps.forEach(bitmap => {
                let bitmapPixelDataName = getName(
                    "bitmap_pixel_data_",
                    bitmap.bitmap,
                    NamingConvention.UnderscoreLowerCase
                );
                bitmapsPixelData.push(
                    `const uint8_t ${bitmapPixelDataName}[${
                        bitmap.pixels.length
                    }] = {${dumpData(bitmap.pixels)}};`
                );
                bitmapsArray.push(
                    `${TAB}{ ${bitmap.width}, ${bitmap.height}, ${bitmapPixelDataName} }`
                );
            });

            resolve(
                `// BITMAP DEFINITIONS\n\n${bitmapsPixelData.join(
                    "\n\n"
                )}\n\nBitmap bitmaps[] = {\n${bitmapsArray.join(",\n")}\n};`
            );
        });
    });
}

////////////////////////////////////////////////////////////////////////////////

function packUnsignedShort(value: number) {
    return [value & 0xff, value >> 8];
}

function packSignedShort(value: number) {
    if (value < 0) {
        value = 65535 + value + 1;
    }
    return [value & 0xff, value >> 8];
}

////////////////////////////////////////////////////////////////////////////////

abstract class Field {
    offset: number;
    size: number;

    enumObjects(objects: ObjectField[]) {}
    finish() {}
    abstract pack(): number[];
}

abstract class ObjectField extends Field {
    objectOffset: number;
    objectSize: number;

    abstract packObject(): number[];
}

class Struct extends ObjectField {
    fields: Field[] = [];

    addField(field: Field) {
        this.fields.push(field);
    }

    enumObjects(objects: ObjectField[]) {
        this.fields.forEach(field => field.enumObjects(objects));
    }

    finish() {
        this.objectSize = this.fields.reduce((offset, field) => {
            field.offset = offset;
            return offset + field.size;
        }, 0);
    }

    pack(): number[] {
        return packUnsignedShort(this.objectOffset);
    }

    packObject(): number[] {
        return this.fields.reduce(
            (data: any, field: any) => data.concat(field.pack()),
            []
        );
    }
}

class ObjectPtr extends Field {
    constructor(public value: ObjectField | undefined) {
        super();
        this.size = 2;
    }

    enumObjects(objects: ObjectField[]) {
        if (this.value) {
            objects.push(this.value);
        }
    }

    pack(): number[] {
        return packUnsignedShort(this.value ? this.value.objectOffset : 0);
    }
}

class ObjectList extends Field {
    items: ObjectField[] = [];

    constructor() {
        super();
        this.size = 3;
    }

    addItem(item: ObjectField) {
        this.items.push(item);
    }

    enumObjects(objects: ObjectField[]) {
        this.items.forEach(item => objects.push(item));
    }

    pack(): number[] {
        return [this.items.length].concat(
            packUnsignedShort(
                this.items.length > 0 ? this.items[0].objectOffset : 0
            )
        );
    }
}

class String extends ObjectField {
    constructor(public value: string) {
        super();
        this.size = 2;
        this.objectSize = this.value.length + 1;
    }

    enumObjects(objects: ObjectField[]) {
        objects.push(this);
    }

    pack(): number[] {
        return packUnsignedShort(this.objectOffset);
    }

    packObject(): number[] {
        let packedData: number[] = [];
        for (let i = 0; i < this.value.length; i++) {
            packedData.push(this.value.charCodeAt(i));
        }
        packedData.push(0);
        return packedData;
    }
}

class UInt8 extends Field {
    constructor(public value: number) {
        super();
        this.size = 1;
    }

    pack(): number[] {
        return [this.value];
    }
}

class UInt16 extends Field {
    constructor(public value: number) {
        super();
        this.size = 2;
    }

    pack(): number[] {
        return packUnsignedShort(this.value);
    }
}

class Int16 extends Field {
    constructor(public value: number) {
        super();
        this.size = 2;
    }

    pack(): number[] {
        return packSignedShort(this.value);
    }
}

////////////////////////////////////////////////////////////////////////////////

function buildGuiStylesEnum(project: Project) {
    let styles = project.allStyles.map(
        style =>
            `${TAB}${getName(
                "STYLE_ID_",
                style,
                NamingConvention.UnderscoreUpperCase
            )}`
    );

    styles.unshift(`${TAB}STYLE_ID_NONE`);

    return `enum StylesEnum {\n${styles.join(",\n")}\n};`;
}

function buildGuiStylesDecl(project: Project) {
    return `extern const uint8_t styles[];`;
}

function buildGuiStylesDef(project: Project) {
    function buildStyle(style: Style) {
        let result = new Struct();

        // font
        let fontIndex = style.fontName ? getFontIndex(style, "fontName") : 0;
        result.addField(new UInt8(fontIndex));

        // flags
        let flags = 0;
        if (style.borderSizeRect.left > 0) {
            flags |= STYLE_FLAGS_BORDER;
        }

        let styleAlignHorizontal = style.alignHorizontalProperty;
        if (styleAlignHorizontal == "left") {
            flags |= STYLE_FLAGS_HORZ_ALIGN_LEFT;
        } else if (styleAlignHorizontal == "right") {
            flags |= STYLE_FLAGS_HORZ_ALIGN_RIGHT;
        } else {
            flags |= STYLE_FLAGS_HORZ_ALIGN_CENTER;
        }

        let styleAlignVertical = style.alignVerticalProperty;
        if (styleAlignVertical == "top") {
            flags |= STYLE_FLAGS_VERT_ALIGN_TOP;
        } else if (styleAlignVertical == "bottom") {
            flags |= STYLE_FLAGS_VERT_ALIGN_BOTTOM;
        } else {
            flags |= STYLE_FLAGS_VERT_ALIGN_CENTER;
        }

        let styleBlink = style.blinkProperty;
        if (styleBlink) {
            flags |= STYLE_FLAGS_BLINK;
        }

        result.addField(new UInt16(flags));

        // colors
        let backgroundColor16 = style.backgroundColor16;
        if (isNaN(backgroundColor16)) {
            backgroundColor16 = 0;
        }
        result.addField(new UInt16(backgroundColor16));
        colors.add(backgroundColor16);

        let color16 = style.color16;
        if (isNaN(color16)) {
            color16 = 0;
        }
        result.addField(new UInt16(color16));
        colors.add(color16);

        let borderColor16 = style.borderColor16;
        if (isNaN(borderColor16)) {
            borderColor16 = 0;
        }
        result.addField(new UInt16(borderColor16));
        colors.add(borderColor16);

        // padding
        result.addField(new UInt8(style.paddingRect.left || 0));
        result.addField(new UInt8(style.paddingRect.top || 0));

        return result;
    }

    function build() {
        let styles = new ObjectList();

        project.allStyles.forEach(style => {
            styles.addItem(buildStyle(style));
        });

        document.addField(styles);
    }

    function finish() {
        let objects: ObjectField[] = [];
        let newObjects: ObjectField[] = [document];
        while (newObjects.length > 0) {
            objects = objects.concat(newObjects);
            let temp: ObjectField[] = [];
            newObjects.forEach(object => object.enumObjects(temp));
            newObjects = temp.filter(object => objects.indexOf(object) == -1);
        }

        objects.forEach(object => object.finish());

        let objectOffset = 0;
        objects.forEach(object => {
            object.objectOffset = objectOffset;
            objectOffset += object.objectSize;
        });

        return objects;
    }

    function pack(objects: ObjectField[] = []): number[] {
        return objects.reduce(
            (data: any, object: any) => data.concat(object.packObject()),
            []
        );
    }

    let colors = new Set<number>();

    let document = new Struct();
    build();
    let objects = finish();
    let data = pack(objects);

    let threeExclamationsDetected = false;
    for (let i = 2; i < data.length; i++) {
        if (data[i - 2] == 33 && data[i - 1] == 33 && data[i] == 33) {
            threeExclamationsDetected = true;
        }
    }
    if (threeExclamationsDetected) {
        // outputSectionsStore.write(output.Section.OUTPUT, output.Type.ERROR, `"!!!" detected in data, not possible to fix (Arduino Mega bootloader bug).`, project);
    }

    return `// STYLES DEFINITION\nconst uint8_t styles[${
        data.length
    }] = {${dumpData(data)}};`;
}

////////////////////////////////////////////////////////////////////////////////

function buildWidget(object: Widget | Page) {
    let result = new Struct();

    // type
    let type: number;
    if (object instanceof Widget) {
        let widget = object;

        let widgetType = widget.type;
        if (widgetType.endsWith("Widget")) {
            widgetType = widgetType.substring(
                0,
                widgetType.length - "Widget".length
            );
        }

        if (widgetType == "Container") {
            type = WIDGET_TYPE_CONTAINER;
        } else if (widgetType == "List") {
            type = WIDGET_TYPE_LIST;
        } else if (widgetType == "Select") {
            type = WIDGET_TYPE_SELECT;
        } else if (widgetType == "DisplayData") {
            type = WIDGET_TYPE_DISPLAY_DATA;
        } else if (widgetType == "Text") {
            type = WIDGET_TYPE_TEXT;
        } else if (widgetType == "MultilineText") {
            type = WIDGET_TYPE_MULTILINE_TEXT;
        } else if (widgetType == "Rectangle") {
            type = WIDGET_TYPE_RECTANGLE;
        } else if (widgetType == "Bitmap") {
            type = WIDGET_TYPE_BITMAP;
        } else if (widgetType == "Button") {
            type = WIDGET_TYPE_BUTTON;
        } else if (widgetType == "ToggleButton") {
            type = WIDGET_TYPE_TOGGLE_BUTTON;
        } else if (widgetType == "ButtonGroup") {
            type = WIDGET_TYPE_BUTTON_GROUP;
        } else if (widgetType == "BarGraph") {
            type = WIDGET_TYPE_BAR_GRAPH;
        } else if (widgetType == "YTGraph") {
            type = WIDGET_TYPE_YT_GRAPH;
        } else if (widgetType == "UpDown") {
            type = WIDGET_TYPE_UP_DOWN;
        } else if (widgetType == "ListGraph") {
            type = WIDGET_TYPE_LIST_GRAPH;
        } else if (widgetType == "UserWidget") {
            type = WIDGET_TYPE_CUSTOM;
        } else {
            type = WIDGET_TYPE_NONE;
        }
    } else {
        type = WIDGET_TYPE_CONTAINER;
    }
    result.addField(new UInt8(type));

    // data
    let data: number = 0;
    if (object instanceof Widget) {
        if (object.data) {
            data = getGlobalVariableIndex(object, "data");
        }
    }
    result.addField(new UInt8(data));

    // action
    let action: number = 0;
    if (object instanceof Widget) {
        if (object.action) {
            action = getActionIndex(object, "action");
        }
    }
    result.addField(new UInt8(action));

    // x
    result.addField(new Int16(object.left || 0));

    // y
    result.addField(new Int16(object.top || 0));

    // width
    result.addField(new UInt16(object.width || 0));

    // height
    result.addField(new UInt16(object.height || 0));

    // style
    let style: number;
    if (object.style) {
        style = getStyleIndex(object, "style");
    } else {
        style = getDefaultStyleIndex(object);
    }
    result.addField(new UInt8(style));

    // specific
    let specific: Struct | undefined;

    if (type == WIDGET_TYPE_CONTAINER) {
        specific = new Struct();

        let widgets: Widget[];
        if (object instanceof ContainerWidget) {
            widgets = object.widgets;
        } else {
            widgets = (object as Page).components.filter(
                widget => widget instanceof Widget
            ) as Widget[];
        }

        // widgets
        let childWidgets = new ObjectList();
        if (widgets) {
            widgets.forEach(childWidget => {
                childWidgets.addItem(buildWidget(childWidget));
            });
        }

        specific.addField(childWidgets);

        if (!(object instanceof Component)) {
            let rects = findPageTransparentRectanglesInContainer(object);

            let rectObjectList = new ObjectList();

            for (let i = 0; i < rects.length; i++) {
                var rect = rects[i];

                let rectStruct = new Struct();

                rectStruct.addField(new Int16(rect.left));
                rectStruct.addField(new Int16(rect.top));
                rectStruct.addField(new UInt16(rect.width));
                rectStruct.addField(new UInt16(rect.height));

                rectObjectList.addItem(rectStruct);
            }

            specific.addField(rectObjectList);

            specific.addField(
                new UInt8(object.closePageIfTouchedOutside ? 1 : 0)
            );
        }
    } else if (type == WIDGET_TYPE_SELECT) {
        let widget = object as SelectWidget;
        specific = new Struct();

        // widgets
        let childWidgets = new ObjectList();
        if (widget.widgets) {
            widget.widgets.forEach(childWidget => {
                childWidgets.addItem(buildWidget(childWidget));
            });
        }

        specific.addField(childWidgets);
    } else if (type == WIDGET_TYPE_LIST) {
        let widget = object as ListWidget;
        specific = new Struct();

        // listType
        specific.addField(
            new UInt8(
                widget.listType === "vertical"
                    ? LIST_TYPE_VERTICAL
                    : LIST_TYPE_HORIZONTAL
            )
        );

        // itemWidget
        let itemWidget: Struct | undefined;
        if (widget.itemWidget) {
            itemWidget = buildWidget(widget.itemWidget);
        } else {
            getProjectStore(object).outputSectionsStore.write(
                Section.OUTPUT,
                MessageType.ERROR,
                "List item widget is missing",
                widget
            );
            itemWidget = undefined;
        }

        specific.addField(new ObjectPtr(itemWidget));
    } else if (type == WIDGET_TYPE_DISPLAY_DATA) {
        let widget = object as DisplayDataWidget;
        specific = new Struct();

        // focusStyle
        let focusStyle: number;
        if (widget.focusStyle) {
            focusStyle = getStyleIndex(widget, "focusStyle");
            if (focusStyle == 0) {
                focusStyle = style;
            }
        } else {
            focusStyle = style;
        }

        specific.addField(new UInt8(focusStyle));
    } else if (type == WIDGET_TYPE_TEXT) {
        let widget = object as TextWidget;
        specific = new Struct();

        // text
        let text: string;
        if (widget.text) {
            text = buildWidgetText(widget.text);
        } else {
            text = "";
        }

        specific.addField(new String(text));

        // flags
        let flags: number = 0;

        // ignoreLuminocity
        if (widget.ignoreLuminocity) {
            flags |= 1 << 0;
        }

        specific.addField(new UInt8(flags));
    } else if (type == WIDGET_TYPE_MULTILINE_TEXT) {
        let widget = object as MultilineTextWidget;
        specific = new Struct();

        // text
        let text: string;
        if (widget.text) {
            text = buildWidgetText(widget.text);
        } else {
            text = "";
        }

        specific.addField(new String(text));
    } else if (type == WIDGET_TYPE_RECTANGLE) {
        let widget = object as RectangleWidget;
        specific = new Struct();

        // flags
        let flags: number = 0;

        // invertColors
        if (widget.invertColors) {
            flags |= 1 << 0;
        }

        // ignoreLuminocity
        if (widget.ignoreLuminocity) {
            flags |= 1 << 1;
        }

        specific.addField(new UInt8(flags));
    } else if (type == WIDGET_TYPE_BAR_GRAPH) {
        let widget = object as BarGraphWidget;
        specific = new Struct();

        // orientation
        let orientation: number;
        switch (widget.orientation) {
            case "left-right":
                orientation = BAR_GRAPH_ORIENTATION_LEFT_RIGHT;
                break;
            case "right-left":
                orientation = BAR_GRAPH_ORIENTATION_RIGHT_LEFT;
                break;
            case "top-bottom":
                orientation = BAR_GRAPH_ORIENTATION_TOP_BOTTOM;
                break;
            default:
                orientation = BAR_GRAPH_ORIENTATION_BOTTOM_TOP;
        }

        specific.addField(new UInt8(orientation));

        // textStyle
        let textStyle: number = 0;
        if (widget.textStyle) {
            textStyle = getStyleIndex(widget, "textStyle");
        }

        specific.addField(new UInt8(textStyle));

        // line1Data
        let line1Data: number | undefined = 0;
        if (widget.line1Data) {
            line1Data = getGlobalVariableIndex(widget, "line1Data");
        }

        specific.addField(new UInt8(line1Data));

        // line1Style
        let line1Style: number = 0;
        if (widget.line1Style) {
            line1Style = getStyleIndex(widget, "line1Style");
        }

        specific.addField(new UInt8(line1Style));

        // line2Data
        let line2Data: number | undefined = 0;
        if (widget.line2Data) {
            line2Data = getGlobalVariableIndex(widget, "line2Data");
        }

        specific.addField(new UInt8(line2Data));

        // line2Style
        let line2Style: number = 0;
        if (widget.line2Style) {
            line2Style = getStyleIndex(widget, "line2Style");
        }

        specific.addField(new UInt8(line2Style));
    } else if (type == WIDGET_TYPE_YT_GRAPH) {
        let widget = object as YTGraphWidget;
        specific = new Struct();

        // y1Style
        let y1Style: number = 0;
        if (widget.y1Style) {
            y1Style = getStyleIndex(widget, "y1Style");
        }

        specific.addField(new UInt8(y1Style));

        // data2
        let y2Data: number | undefined = 0;
        if (widget.y2Data) {
            y2Data = getGlobalVariableIndex(widget, "y2Data");
        }

        specific.addField(new UInt8(y2Data));

        // y2Style
        let y2Style: number = 0;
        if (widget.y2Style) {
            y2Style = getStyleIndex(widget, "y2Style");
        }

        specific.addField(new UInt8(y2Style));
    } else if (type == WIDGET_TYPE_UP_DOWN) {
        let widget = object as UpDownWidget;
        specific = new Struct();

        // buttonStyle
        let buttonsStyle: number = 0;
        if (widget.buttonsStyle) {
            buttonsStyle = getStyleIndex(widget, "buttonsStyle");
        }

        specific.addField(new UInt8(buttonsStyle));

        // down button text
        let downButtonText: string;
        if (widget.downButtonText) {
            downButtonText = buildWidgetText(widget.downButtonText);
        } else {
            downButtonText = "<";
        }

        specific.addField(new String(downButtonText));
        // up button text
        let upButtonText: string;
        if (widget.upButtonText) {
            upButtonText = buildWidgetText(widget.upButtonText);
        } else {
            upButtonText = ">";
        }

        specific.addField(new String(upButtonText));
    } else if (type == WIDGET_TYPE_LIST_GRAPH) {
        let widget = object as ListGraphWidget;
        specific = new Struct();

        // dwellData
        let dwellData: number | undefined = 0;
        if (widget.dwellData) {
            dwellData = getGlobalVariableIndex(widget, "dwellData");
        }

        specific.addField(new UInt8(dwellData));

        // y1Data
        let y1Data: number | undefined = 0;
        if (widget.y1Data) {
            y1Data = getGlobalVariableIndex(widget, "y1Data");
        }

        specific.addField(new UInt8(y1Data));

        // y1Style
        let y1Style: number = 0;
        if (widget.y1Style) {
            y1Style = getStyleIndex(widget, "y1Style");
        }

        specific.addField(new UInt8(y1Style));

        // y2Data
        let y2Data: number | undefined = 0;
        if (widget.y2Data) {
            y2Data = getGlobalVariableIndex(widget, "y2Data");
        }

        specific.addField(new UInt8(y2Data));

        // y2Style
        let y2Style: number = 0;
        if (widget.y2Style) {
            y2Style = getStyleIndex(widget, "y2Style");
        }

        specific.addField(new UInt8(y2Style));

        // cursorData
        let cursorData: number | undefined = 0;
        if (widget.cursorData) {
            cursorData = getGlobalVariableIndex(widget, "cursorData");
        }

        specific.addField(new UInt8(cursorData));

        // cursorStyle
        let cursorStyle: number = 0;
        if (widget.cursorStyle) {
            cursorStyle = getStyleIndex(widget, "cursorStyle");
        }

        specific.addField(new UInt8(cursorStyle));
    } else if (type == WIDGET_TYPE_BUTTON) {
        let widget = object as ButtonWidget;
        specific = new Struct();

        // text
        let text: string;
        if (widget.text) {
            text = buildWidgetText(widget.text);
        } else {
            text = "";
        }

        specific.addField(new String(text));

        // enabled
        let enabledData: number | undefined = 0;
        if (widget.enabled) {
            enabledData = getGlobalVariableIndex(widget, "enabled");
        }

        specific.addField(new UInt8(enabledData));

        // disabledStyle
        let disabledStyle: number = 0;
        if (widget.disabledStyle) {
            disabledStyle = getStyleIndex(widget, "disabledStyle");
        }

        specific.addField(new UInt8(disabledStyle));
    } else if (type == WIDGET_TYPE_TOGGLE_BUTTON) {
        let widget = object as ToggleButtonWidget;
        specific = new Struct();

        // text 1
        let text1: string;
        if (widget.text1) {
            text1 = buildWidgetText(widget.text1);
        } else {
            text1 = "";
        }

        specific.addField(new String(text1));

        // text 2
        let text2: string;
        if (widget.text2) {
            text2 = buildWidgetText(widget.text2);
        } else {
            text2 = "";
        }

        specific.addField(new String(text2));
    } else if (type == WIDGET_TYPE_BITMAP) {
        let widget = object as BitmapWidget;
        specific = new Struct();

        // bitmap
        let bitmap: number = 0;
        if (widget.bitmap) {
            bitmap = getBitmapIndex(widget, "bitmap");
        }

        specific.addField(new UInt8(bitmap));
    } else if (type == WIDGET_TYPE_CUSTOM) {
        let widget = object as UserWidgetWidget;
        specific = new Struct();

        // layout
        let userWidgetPage: number = 0;
        if (widget.userWidgetPageName) {
            userWidgetPage = getPageLayoutIndex(widget, "userWidgetPageName");
        }

        specific.addField(new UInt8(userWidgetPage));
    }

    result.addField(new ObjectPtr(specific));

    return result;
}

////////////////////////////////////////////////////////////////////////////////

function buildGuiPagesEnum(project: Project) {
    let pages = project.pages
        .filter(page => !page.isUsedAsUserWidget)
        .map(
            widget =>
                `${TAB}${getName(
                    "PAGE_ID_",
                    widget,
                    NamingConvention.UnderscoreUpperCase
                )}`
        )
        .join(",\n");

    return `enum PagesEnum {\n${pages}\n};`;
}

function buildGuiDocumentDecl(project: Project) {
    return `extern const uint8_t document[];`;
}

function buildGuiDocumentDef(
    project: Project,
    orientation: "portrait" | "landscape"
) {
    function buildCustomWidget(customWidget: Page) {
        var customWidgetStruct = new Struct();

        // widgets
        let childWidgets = new ObjectList();
        customWidget.components
            .filter(widget => widget instanceof Widget)
            .forEach((childWidget: Widget) => {
                childWidgets.addItem(buildWidget(childWidget));
            });

        customWidgetStruct.addField(childWidgets);

        return customWidgetStruct;
    }

    function buildPage(page: Page) {
        // if (orientation === "portrait") {
        //     const pageOrientation = page.portrait
        //         ? page.portrait
        //         : createObject<PageOrientation>(
        //               getProjectStore(project),
        //               page,
        //               {
        //                   left: 0,
        //                   top: 0,
        //                   width: 240,
        //                   height: 320,
        //                   components: [],
        //                   rect: {
        //                       left: 0,
        //                       top: 0,
        //                       width: 240,
        //                       height: 320
        //                   }
        //               },
        //               PageOrientation
        //           );
        //     return buildWidget(pageOrientation);
        // }
        return buildWidget(page);
    }

    function build() {
        let customWidgets = new ObjectList();
        project.pages
            .filter(page => page.isUsedAsUserWidget)
            .forEach(customWidget => {
                customWidgets.addItem(buildCustomWidget(customWidget));
            });
        document.addField(customWidgets);

        let pages = new ObjectList();
        project.pages
            .filter(page => !page.isUsedAsUserWidget)
            .forEach(page => {
                pages.addItem(buildPage(page));
            });
        document.addField(pages);
    }

    function finish() {
        let objects: ObjectField[] = [];
        let newObjects: ObjectField[] = [document];
        while (newObjects.length > 0) {
            objects = objects.concat(newObjects);
            let temp: ObjectField[] = [];
            newObjects.forEach(object => object.enumObjects(temp));
            newObjects = temp.filter(object => objects.indexOf(object) == -1);
        }

        objects.forEach(object => object.finish());

        let objectOffset = 0;
        objects.forEach(object => {
            object.objectOffset = objectOffset;
            objectOffset += object.objectSize;
        });

        return objects;
    }

    function pack(objects: ObjectField[] = []): number[] {
        return objects.reduce(
            (data: any, object: any) => data.concat(object.packObject()),
            []
        );
    }

    let document = new Struct();
    build();
    let objects = finish();
    let data = pack(objects);

    let threeExclamationsDetected = false;
    for (let i = 2; i < data.length; i++) {
        if (data[i - 2] == 33 && data[i - 1] == 33 && data[i] == 33) {
            threeExclamationsDetected = true;
        }
    }
    if (threeExclamationsDetected) {
        //outputSectionsStore.write(output.Section.OUTPUT, output.Type.ERROR, `"!!!" detected in data, not possible to fix (Arduino Mega bootloader bug).`, project);
    }

    return `// DOCUMENT DEFINITION\nconst uint8_t document[${
        data.length
    }] = {${dumpData(data)}};`;
}

////////////////////////////////////////////////////////////////////////////////

export async function build(
    project: Project,
    sectionNames: string[] | undefined,
    buildConfiguration: BuildConfiguration | undefined
): Promise<BuildResult> {
    const result: any = {};

    if (!sectionNames || sectionNames.indexOf("GUI_FONTS_ENUM") !== -1) {
        result.GUI_FONTS_ENUM = buildGuiFontsEnum(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_BITMAPS_ENUM") !== -1) {
        result.GUI_BITMAPS_ENUM = buildGuiBitmapsEnum(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_STYLES_ENUM") !== -1) {
        result.GUI_STYLES_ENUM = buildGuiStylesEnum(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_PAGES_ENUM") !== -1) {
        result.GUI_PAGES_ENUM = buildGuiPagesEnum(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_FONTS_DECL") !== -1) {
        result.GUI_FONTS_DECL = buildGuiFontsDecl(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_FONTS_DEF") !== -1) {
        result.GUI_FONTS_DEF = buildGuiFontsDef(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_BITMAPS_DECL") !== -1) {
        result.GUI_BITMAPS_DECL = buildGuiBitmapsDecl(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_BITMAPS_DEF") !== -1) {
        result.GUI_BITMAPS_DEF = await buildGuiBitmapsDef(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_STYLES_DECL") !== -1) {
        result.GUI_STYLES_DECL = buildGuiStylesDecl(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_STYLES_DEF") !== -1) {
        result.GUI_STYLES_DEF = buildGuiStylesDef(project);
    }

    if (!sectionNames || sectionNames.indexOf("GUI_DOCUMENT_DECL") !== -1) {
        result.GUI_DOCUMENT_DECL = buildGuiDocumentDecl(project);
    }

    if (
        !sectionNames ||
        sectionNames.indexOf("GUI_DOCUMENT_PORTRAIT_DEF") !== -1
    ) {
        result.GUI_DOCUMENT_PORTRAIT_DEF = buildGuiDocumentDef(
            project,
            "portrait"
        );
    }

    if (
        !sectionNames ||
        sectionNames.indexOf("GUI_DOCUMENT_LANDSCAPE_DEF") !== -1
    ) {
        result.GUI_DOCUMENT_LANDSCAPE_DEF = buildGuiDocumentDef(
            project,
            "landscape"
        );
    }

    return result;
}
