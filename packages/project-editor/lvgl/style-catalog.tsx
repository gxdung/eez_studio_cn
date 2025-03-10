import React from "react";
import { observer } from "mobx-react";
import Select from "react-select";

import { isArray } from "eez-studio-shared/util";

import {
    EezObject,
    EnumItem,
    IEezObject,
    PropertyInfo,
    PropertyProps,
    PropertyType
} from "project-editor/core/object";

import { ProjectStore } from "project-editor/store";

import {
    LVGLStylePropCode,
    LVGL_STYLE_PROP_CODES,
    LV_FLEX_ALIGN_CENTER,
    LV_FLEX_ALIGN_END,
    LV_FLEX_ALIGN_SPACE_AROUND,
    LV_FLEX_ALIGN_SPACE_BETWEEN,
    LV_FLEX_ALIGN_SPACE_EVENLY,
    LV_FLEX_ALIGN_START,
    LV_FLEX_FLOW_COLUMN,
    LV_FLEX_FLOW_COLUMN_REVERSE,
    LV_FLEX_FLOW_COLUMN_WRAP,
    LV_FLEX_FLOW_COLUMN_WRAP_REVERSE,
    LV_FLEX_FLOW_ROW,
    LV_FLEX_FLOW_ROW_REVERSE,
    LV_FLEX_FLOW_ROW_WRAP,
    LV_FLEX_FLOW_ROW_WRAP_REVERSE,
    LV_GRID_ALIGN_CENTER,
    LV_GRID_ALIGN_END,
    LV_GRID_ALIGN_SPACE_AROUND,
    LV_GRID_ALIGN_SPACE_BETWEEN,
    LV_GRID_ALIGN_SPACE_EVENLY,
    LV_GRID_ALIGN_START,
    LV_GRID_ALIGN_STRETCH,
    LV_LAYOUT_FLEX,
    LV_LAYOUT_GRID,
    LV_LAYOUT_NONE
} from "project-editor/lvgl/lvgl-constants";
import { ProjectEditor } from "project-editor/project-editor-interface";
import { getEnumItems } from "project-editor/ui-components/PropertyGrid/utils";
import type { LVGLPageRuntime } from "./page-runtime";
import { settingsController } from "home/settings";

////////////////////////////////////////////////////////////////////////////////

export const BUILT_IN_FONTS = [
    "MONTSERRAT_8",
    "MONTSERRAT_10",
    "MONTSERRAT_12",
    "MONTSERRAT_14",
    "MONTSERRAT_16",
    "MONTSERRAT_18",
    "MONTSERRAT_20",
    "MONTSERRAT_22",
    "MONTSERRAT_24",
    "MONTSERRAT_26",
    "MONTSERRAT_28",
    "MONTSERRAT_30",
    "MONTSERRAT_32",
    "MONTSERRAT_34",
    "MONTSERRAT_36",
    "MONTSERRAT_38",
    "MONTSERRAT_40",
    "MONTSERRAT_42",
    "MONTSERRAT_44",
    "MONTSERRAT_46",
    "MONTSERRAT_48"
];

////////////////////////////////////////////////////////////////////////////////

interface LVGLStyleProp {
    code: LVGLStylePropCode;
    description: string;
    defaultValue: string;
    inherited: boolean;
    layout: boolean;
    extDraw: boolean;
    valueRead?: (value: number) => string;
    valueToNum?: (value: string, runtime: LVGLPageRuntime) => number | number[];
    valueBuild?: (value: string) => string;
}

export type LVGLPropertyInfo = PropertyInfo & {
    lvglStyleProp: LVGLStyleProp;
};

export class PropertyValueHolder extends EezObject {
    [propertyName: string]: any;
    constructor(
        public projectStore: ProjectStore,
        propertyName: string,
        propertyValue: any
    ) {
        super();
        this[propertyName] = propertyValue;
    }
}

////////////////////////////////////////////////////////////////////////////////

function makeEnumPropertyInfo(
    name: string,
    displayName: string,
    lvglStyleProp: LVGLStyleProp,
    enumItemToCodeOrStringArray: { [key: string]: number } | string[],
    buildPrefix: string,
    propertyGridColumnComponent?: React.ComponentType<PropertyProps>
): LVGLPropertyInfo {
    let enumItemToCode: { [key: string]: number };
    if (isArray(enumItemToCodeOrStringArray)) {
        enumItemToCode = {};
        for (let i = 0; i < enumItemToCodeOrStringArray.length; i++) {
            enumItemToCode[enumItemToCodeOrStringArray[i]] = i;
        }
    } else {
        enumItemToCode = enumItemToCodeOrStringArray;
    }

    const codeToEnumItem: { [code: string]: string } = {};

    Object.keys(enumItemToCode).forEach(
        enumItem =>
            (codeToEnumItem[enumItemToCode[enumItem].toString()] = enumItem)
    );

    return {
        name,
        displayName,
        type: PropertyType.Enum,
        enumItems: Object.keys(enumItemToCode).map(id => ({
            id,
            label: id
        })),
        enumDisallowUndefined: true,
        propertyGridColumnComponent,
        lvglStyleProp: Object.assign(lvglStyleProp, {
            buildPrefix,
            enumItemToCodeOrStringArray,
            valueRead: lvglStyleProp.valueRead
                ? lvglStyleProp.valueRead
                : (value: number) => codeToEnumItem[value.toString()],
            valueToNum: lvglStyleProp.valueToNum
                ? lvglStyleProp.valueToNum
                : (value: string) => enumItemToCode[value.toString()],
            valueBuild: lvglStyleProp.valueBuild
                ? lvglStyleProp.valueBuild
                : (value: string) => buildPrefix + value
        })
    };
}

////////////////////////////////////////////////////////////////////////////////

//
// POSITION AND SIZE
//

const width_property_info: LVGLPropertyInfo = {
    name: "width",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_WIDTH,
        description:
            "设置对象的宽度。可以使用像素、百分比和 LV_SIZE_CONTENT 值。百分比值相对于父容器区域的宽度。",
        defaultValue: "Widget dependent",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const height_property_info: LVGLPropertyInfo = {
    name: "height",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_HEIGHT,
        description:
            "设置对象的高度。可以使用像素、百分比和 LV_SIZE_CONTENT 值。百分比值相对于父容器区域的高度。",
        defaultValue: "Widget dependent",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const min_width_property_info: LVGLPropertyInfo = {
    name: "min_width",
    displayName: "最小宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MIN_WIDTH,
        description:
            "设置最小宽度。可以使用像素和百分比值。百分比值相对于父容器区域的宽度。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const max_width_property_info: LVGLPropertyInfo = {
    name: "max_width",
    displayName: "最大宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MAX_WIDTH,
        description:
            "设置最大宽度。可以使用像素和百分比值。百分比值相对于父容器区域的宽度。",
        defaultValue: "LV_COORD_MAX",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const min_height_property_info: LVGLPropertyInfo = {
    name: "min_height",
    displayName: "最小高度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MIN_HEIGHT,
        description:
            "设置最小高度。可以使用像素和百分比值。百分比值相对于父容器区域的高度。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const max_height_property_info: LVGLPropertyInfo = {
    name: "max_height",
    displayName: "最大高度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MAX_HEIGHT,
        description:
            "设置最大高度。可以使用像素和百分比值。百分比值相对于父容器区域的高度。",
        defaultValue: "LV_COORD_MAX",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const length_property_info: LVGLPropertyInfo = {
    name: "length",
    displayName: "长度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LENGTH,
        description: "",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const x_property_info: LVGLPropertyInfo = {
    name: "x",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_X,
        description:
            "Set the X coordinate of the object considering the set align. Pixel and percentage values can be used. Percentage values are relative to the width of the parent's content area.",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const y_property_info: LVGLPropertyInfo = {
    name: "y",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_Y,
        description:
            "Set the Y coordinate of the object considering the set align. Pixel and percentage values can be used. Percentage values are relative to the height of the parent's content area.",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const align_property_info = makeEnumPropertyInfo(
    "align",
    "对齐",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ALIGN,
        description:
            "设置对齐方式，该对齐情况从父容器的位置开始，应解释X和Y坐标。可能的值是：lv_align_default，lv_align_top_left/primd/prirs，lv_align_bottom_left/ide/right，lv_align_left/right_mid，lv_align_center。 lv_align_default是指具有LTR基本方向的LV_ALIGN_TOP_LEFT，而 LV_ALIGN_TOP_RIGRT 则带有 RTL 基本方向。",
        defaultValue: "LV_ALIGN_DEFAULT",
        inherited: false,
        layout: true,
        extDraw: false
    },
    [
        "DEFAULT",
        "TOP_LEFT",
        "TOP_MID",
        "TOP_RIGHT",
        "BOTTOM_LEFT",
        "BOTTOM_MID",
        "BOTTOM_RIGHT",
        "LEFT_MID",
        "RIGHT_MID",
        "CENTER",

        "OUT_TOP_LEFT",
        "OUT_TOP_MID",
        "OUT_TOP_RIGHT",
        "OUT_BOTTOM_LEFT",
        "OUT_BOTTOM_MID",
        "OUT_BOTTOM_RIGHT",
        "OUT_LEFT_TOP",
        "OUT_LEFT_MID",
        "OUT_LEFT_BOTTOM",
        "OUT_RIGHT_TOP",
        "OUT_RIGHT_MID",
        "OUT_RIGHT_BOTTOM"
    ],
    "LV_ALIGN_"
);

const transform_width_property_info: LVGLPropertyInfo = {
    name: "transform_width",
    displayName: "变换:宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_WIDTH,
        description:
            "用这个值使对象更宽。像素和百分比（使用LV_PCT（x））值可以使用。百分比值相对于对象的宽度。",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};

const transform_height_property_info: LVGLPropertyInfo = {
    name: "transform_height",
    displayName: "变换:高度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_HEIGHT,
        description:
            "通过此值使两侧的对象更高。像素和百分比（使用LV_PCT（x））值可以使用。百分比值相对于对象的高度。",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};

const translate_x_property_info: LVGLPropertyInfo = {
    name: "translate_x",
    displayName: "变换:水平偏移",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSLATE_X,
        description:
            "以水平方向移动对象。在布局，对齐和其他定位后应用。像素和百分比（使用LV_PCT（x））值可以使用。百分比值相对于对象的宽度。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const translate_y_property_info: LVGLPropertyInfo = {
    name: "translate_y",
    displayName: "变换:垂直偏移",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSLATE_Y,
        description:
            "以垂直方向移动对象。在布局，对齐和其他定位后应用。像素和百分比（使用LV_PCT（x））值可以使用。百分比值相对于对象的高度。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

export const transform_zoom_property_info: LVGLPropertyInfo = {
    name: "transform_zoom",
    displayName: "变换:缩放",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_ZOOM,
        description:
            "缩放对象。256（或lv_img_zoom_none）为正常大小，128为50%，512为2倍大小等",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

export const transform_scale_x_property_info: LVGLPropertyInfo = {
    name: "transform_scale_x",
    displayName: "变换:水平缩放",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_SCALE_X,
        description:
            "水平缩放对象，256（或lv_img_zoom_none）为正常大小，128为50%，512为2倍大小等",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

export const transform_scale_y_property_info: LVGLPropertyInfo = {
    name: "transform_scale_y",
    displayName: "变换:垂直缩放",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_SCALE_Y,
        description:
            "垂直缩放对象，256（或lv_img_zoom_none）为正常大小，128为50%，512为2倍大小等",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

export const transform_angle_property_info: LVGLPropertyInfo = {
    name: "transform_angle",
    displayName: "变换:角度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_ANGLE,
        description: "旋转一个对象。该值以0.1度为最小单位。例如: 450表示45度。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

export const transform_rotation_property_info: LVGLPropertyInfo = {
    name: "transform_rotation",
    displayName: "变换:旋转",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_ROTATION,
        description: "旋转一个对象。该值以0.1度为最小单位。例如: 450表示45度。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const transform_pivot_x_property_info: LVGLPropertyInfo = {
    name: "transform_pivot_x",
    displayName: "定点X轴偏移距离",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_PIVOT_X,
        description: "设置固定的X坐标来进行偏移，相对于物体的左上角",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const transform_pivot_y_property_info: LVGLPropertyInfo = {
    name: "transform_pivot_y",
    displayName: "定点Y轴偏移距离",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_PIVOT_Y,
        description: "设置固定的Y坐标来进行偏移，相对于物体的左上角",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

const transform_skew_x_property_info: LVGLPropertyInfo = {
    name: "transform_skew_x",
    displayName: "变换:水平偏斜",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_SKEW_X,
        description: "",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const transform_skew_y_property_info: LVGLPropertyInfo = {
    name: "transform_skew_y",
    displayName: "变换:垂直偏斜",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSFORM_SKEW_Y,
        description: "",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

//
// LAYOUT
//

const layout_property_info = makeEnumPropertyInfo(
    "layout",
    "父容器排列",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LAYOUT,
        description:
            "设置对象布局。子元素将根据布局制定的政策重新定位和调整大小。对于可能的值，请参见布局的文档。",
        defaultValue: "LV_FLEX_FLOW_ROW",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        NONE: LV_LAYOUT_NONE, // No layout
        FLEX: LV_LAYOUT_FLEX, // Use flex layout
        GRID: LV_LAYOUT_GRID // Use grid layout
    },
    "LV_LAYOUT_"
);

const flex_flow_property_info = makeEnumPropertyInfo(
    "flex_flow",
    "Flex 弹性元素排列",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_FLEX_FLOW,
        description: "Determines a type of Flex layout used",
        defaultValue: "LV_FLEX_FLOW_ROW",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        ROW: LV_FLEX_FLOW_ROW, // Place the children in a row without wrapping
        COLUMN: LV_FLEX_FLOW_COLUMN, // Place the children in a column without wrapping
        ROW_WRAP: LV_FLEX_FLOW_ROW_WRAP, // Place the children in a row with wrapping
        ROW_REVERSE: LV_FLEX_FLOW_ROW_REVERSE, // Place the children in a column with wrapping
        ROW_WRAP_REVERSE: LV_FLEX_FLOW_ROW_WRAP_REVERSE, // Place the children in a row without wrapping but in reversed order
        COLUMN_WRAP: LV_FLEX_FLOW_COLUMN_WRAP, // Place the children in a column without wrapping but in reversed order
        COLUMN_REVERSE: LV_FLEX_FLOW_COLUMN_REVERSE, // Place the children in a row with wrapping but in reversed order
        COLUMN_WRAP_REVERSE: LV_FLEX_FLOW_COLUMN_WRAP_REVERSE // Place the children in a column with wrapping but in reversed order
    },
    "LV_FLEX_FLOW_"
);

const flex_main_place_property_info = makeEnumPropertyInfo(
    "flex_main_place",
    "Flex 弹性主轴排列",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_FLEX_MAIN_PLACE,
        description: "确定如何在主轴上分配轨道（track）内项目的排列方式。",
        defaultValue: "LV_FLEX_ALIGN_START",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_FLEX_ALIGN_START, // means left on a horizontally and top vertically (default)
        END: LV_FLEX_ALIGN_END, // means right on a horizontally and bottom vertically
        CENTER: LV_FLEX_ALIGN_CENTER, // simply center
        SPACE_EVENLY: LV_FLEX_ALIGN_SPACE_EVENLY, // items are distributed so that the spacing between any two items (and the space to the edges) is equal. Does not apply to track_cross_place.
        SPACE_AROUND: LV_FLEX_ALIGN_SPACE_AROUND, // items are evenly distributed in the track with equal space around them. Note that visually the spaces aren't equal, since all the items have equal space on both sides. The first item will have one unit of space against the container edge, but two units of space between the next item because that next item has its own spacing that applies. Not applies to track_cross_place.
        SPACE_BETWEEN: LV_FLEX_ALIGN_SPACE_BETWEEN // items are evenly distributed in the track: first item is on the start line, last item on the end line. Not applies to track_cross_place.
    },
    "LV_FLEX_ALIGN_"
);

const flex_cross_place_property_info = makeEnumPropertyInfo(
    "flex_cross_place",
    "Flex 弹性交叉轴排列",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_FLEX_CROSS_PLACE,
        description: "确定如何在交叉轴上分配轨道（track）内项目的排列方式。",
        defaultValue: "LV_FLEX_ALIGN_START",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_FLEX_ALIGN_START, // means left on a horizontally and top vertically (default)
        END: LV_FLEX_ALIGN_END, // means right on a horizontally and bottom vertically
        CENTER: LV_FLEX_ALIGN_CENTER // simply center
    },
    "LV_FLEX_ALIGN_"
);

const flex_track_place_property_info = makeEnumPropertyInfo(
    "flex_track_place",
    "Flex 弹性轨道排列",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_FLEX_TRACK_PLACE,
        description: "确定如何分配多条轨道（track）之间的间距。",
        defaultValue: "LV_FLEX_ALIGN_START",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_FLEX_ALIGN_START, // means left on a horizontally and top vertically (default)
        END: LV_FLEX_ALIGN_END, // means right on a horizontally and bottom vertically
        CENTER: LV_FLEX_ALIGN_CENTER, // simply center
        SPACE_EVENLY: LV_FLEX_ALIGN_SPACE_EVENLY, // items are distributed so that the spacing between any two items (and the space to the edges) is equal. Does not apply to track_cross_place.
        SPACE_AROUND: LV_FLEX_ALIGN_SPACE_AROUND, // items are evenly distributed in the track with equal space around them. Note that visually the spaces aren't equal, since all the items have equal space on both sides. The first item will have one unit of space against the container edge, but two units of space between the next item because that next item has its own spacing that applies. Not applies to track_cross_place.
        SPACE_BETWEEN: LV_FLEX_ALIGN_SPACE_BETWEEN // items are evenly distributed in the track: first item is on the start line, last item on the end line. Not applies to track_cross_place.
    },
    "LV_FLEX_ALIGN_"
);

const flex_grow_property_info: LVGLPropertyInfo = {
    name: "flex_grow",
    displayName: "Flex 弹性扩展比例",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_FLEX_GROW,
        description:
            "用于让一个或多个子项填满轨道的可用空间。若多个子项均设定了扩展值，剩余空间将按比例分配。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const grid_column_align_property_info: LVGLPropertyInfo = makeEnumPropertyInfo(
    "grid_column_align",
    "Grid 网格列对齐",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_COLUMN_ALIGN,
        description: "定义如何在容器内分配列（column）的布局。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_GRID_ALIGN_START,
        CENTER: LV_GRID_ALIGN_CENTER,
        END: LV_GRID_ALIGN_END,
        STRETCH: LV_GRID_ALIGN_STRETCH,
        SPACE_EVENLY: LV_GRID_ALIGN_SPACE_EVENLY,
        SPACE_AROUND: LV_GRID_ALIGN_SPACE_AROUND,
        SPACE_BETWEEN: LV_GRID_ALIGN_SPACE_BETWEEN
    },
    "LV_GRID_ALIGN_"
);

const grid_row_align_property_info: LVGLPropertyInfo = makeEnumPropertyInfo(
    "grid_row_align",
    "Grid 网格行对齐",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_ROW_ALIGN,
        description: "定义如何在容器内分配行（row）的布局。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_GRID_ALIGN_START,
        CENTER: LV_GRID_ALIGN_CENTER,
        END: LV_GRID_ALIGN_END,
        STRETCH: LV_GRID_ALIGN_STRETCH,
        SPACE_EVENLY: LV_GRID_ALIGN_SPACE_EVENLY,
        SPACE_AROUND: LV_GRID_ALIGN_SPACE_AROUND,
        SPACE_BETWEEN: LV_GRID_ALIGN_SPACE_BETWEEN
    },
    "LV_GRID_ALIGN_"
);

function dscArrayValueRead(value: number) {
    return "";
}

function getArrayFromValue(value: string, build: boolean = false) {
    let arr;
    if (value.indexOf(",") !== -1) {
        arr = value.split(",").map(v => parseInt(v));
    } else {
        arr = value.split(" ").map(v => parseInt(v));
    }
    arr = arr.filter(v => !isNaN(v));

    if (!build) {
        for (let i = arr.length; i < 100; i++) {
            arr.push(0);
        }
    }

    return arr;
}

function dscArrayValueToNum(value: string) {
    return getArrayFromValue(value);
}

function dscArrayValueBuild(value: string) {
    return getArrayFromValue(value, true).join(", ");
}

export const grid_row_dsc_array_property_info: LVGLPropertyInfo = {
    name: "grid_row_dsc_array",
    displayName: "Grid 网格行描述符",
    type: PropertyType.NumberArrayAsString,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_ROW_DSC_ARRAY,
        description:
            "用于定义网格行结构的数组，必须以 LV_GRID_TEMPLATE_LAST 表示结束。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false,
        valueRead: dscArrayValueRead,
        valueToNum: dscArrayValueToNum,
        valueBuild: dscArrayValueBuild
    }
};

export const grid_column_dsc_array_property_info: LVGLPropertyInfo = {
    name: "grid_column_dsc_array",
    displayName: "Grid 网格列描述符",
    type: PropertyType.NumberArrayAsString,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_COLUMN_DSC_ARRAY,
        description:
            "用于定义网格列结构的数组，必须以 LV_GRID_TEMPLATE_LAST 表示结束。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false,
        valueRead: dscArrayValueRead,
        valueToNum: dscArrayValueToNum,
        valueBuild: dscArrayValueBuild
    }
};

const grid_cell_column_pos_property_info: LVGLPropertyInfo = {
    name: "grid_cell_column_pos",
    displayName: "Grid 单元格列位置",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_CELL_COLUMN_POS,
        description: "设置对象应放置的列序号。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false,
        valueToNum: (value: string, runtime) =>
            runtime.isV9 ? parseInt(value) : parseInt(value) * 2 // For some reason, in v8.x, the value must be multiplied by 2, but, only in simulator
    }
};

const grid_cell_column_span_property_info: LVGLPropertyInfo = {
    name: "grid_cell_column_span",
    displayName: "Grid 单元格列跨度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_CELL_COLUMN_SPAN,
        description: "设置对象横向跨越的列数（必须≥1）。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const grid_cell_x_align_property_info: LVGLPropertyInfo = makeEnumPropertyInfo(
    "grid_cell_x_align",
    "Grid 单元格水平对齐",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_CELL_X_ALIGN,
        description: "设置对象的水平方向对齐方式。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_GRID_ALIGN_START,
        CENTER: LV_GRID_ALIGN_CENTER,
        END: LV_GRID_ALIGN_END,
        STRETCH: LV_GRID_ALIGN_STRETCH,
        SPACE_EVENLY: LV_GRID_ALIGN_SPACE_EVENLY,
        SPACE_AROUND: LV_GRID_ALIGN_SPACE_AROUND,
        SPACE_BETWEEN: LV_GRID_ALIGN_SPACE_BETWEEN
    },
    "LV_GRID_ALIGN_"
);

const grid_cell_row_pos_property_info: LVGLPropertyInfo = {
    name: "grid_cell_row_pos",
    displayName: "Grid 单元格行位置",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_CELL_ROW_POS,
        description: "设置对象应放置的行序号。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false,
        valueToNum: (value: string, runtime) =>
            runtime.isV9 ? parseInt(value) : parseInt(value) * 2 // For some reason, in v8.x, the value must be multiplied by 2, but, only in simulator
    }
};

const grid_cell_row_span_property_info: LVGLPropertyInfo = {
    name: "grid_cell_row_span",
    displayName: "Grid 单元格行跨度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_CELL_ROW_SPAN,
        description: "设置对象纵向跨越的行数（必须≥1）。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const grid_cell_y_align_property_info: LVGLPropertyInfo = makeEnumPropertyInfo(
    "grid_cell_y_align",
    "Grid 单元格垂直对齐",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_GRID_CELL_Y_ALIGN,
        description: "设置对象的垂直方向对齐方式。",
        defaultValue: "1",
        inherited: false,
        layout: true,
        extDraw: false
    },
    {
        START: LV_GRID_ALIGN_START,
        CENTER: LV_GRID_ALIGN_CENTER,
        END: LV_GRID_ALIGN_END,
        STRETCH: LV_GRID_ALIGN_STRETCH,
        SPACE_EVENLY: LV_GRID_ALIGN_SPACE_EVENLY,
        SPACE_AROUND: LV_GRID_ALIGN_SPACE_AROUND,
        SPACE_BETWEEN: LV_GRID_ALIGN_SPACE_BETWEEN
    },
    "LV_GRID_ALIGN_"
);

//
// PADDING
//

export const pad_top_property_info: LVGLPropertyInfo = {
    name: "pad_top",
    displayName: "顶部间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_PAD_TOP,
        description: "CSS: Padding Top",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
export const pad_bottom_property_info: LVGLPropertyInfo = {
    name: "pad_bottom",
    displayName: "底部间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_PAD_BOTTOM,
        description: "CSS: Padding Bottom",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
export const pad_left_property_info: LVGLPropertyInfo = {
    name: "pad_left",
    displayName: "左侧间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_PAD_LEFT,
        description: "CSS: Padding Left",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
export const pad_right_property_info: LVGLPropertyInfo = {
    name: "pad_right",
    displayName: "右侧间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_PAD_RIGHT,
        description: "CSS: Padding Right",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const pad_row_property_info: LVGLPropertyInfo = {
    name: "pad_row",
    displayName: "行间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_PAD_ROW,
        description: "Sets the padding between the rows. Used by the layouts.",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const pad_column_property_info: LVGLPropertyInfo = {
    name: "pad_column",
    displayName: "列间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_PAD_COLUMN,
        description:
            "Sets the padding between the columns. Used by the layouts.",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

//
// MARGIN
//
const margin_top_property_info: LVGLPropertyInfo = {
    name: "margin_top",
    displayName: "顶部边距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MARGIN_TOP,
        description: "CSS: Margin Top, 设置元素上方与其他元素/容器之间的间距。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const margin_bottom_property_info: LVGLPropertyInfo = {
    name: "margin_bottom",
    displayName: "底部边距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MARGIN_BOTTOM,
        description:
            "CSS: Margin Bottom, 设置元素下方与其他元素/容器之间的间距。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const margin_left_property_info: LVGLPropertyInfo = {
    name: "margin_left",
    displayName: "左侧边距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MARGIN_LEFT,
        description:
            "CSS: Margin Left, 设置元素左侧与其他元素/容器之间的间距。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};
const margin_right_property_info: LVGLPropertyInfo = {
    name: "margin_right",
    displayName: "右侧边距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_MARGIN_RIGHT,
        description:
            "CSS: Margin Right, 设置元素右侧与其他元素/容器之间的间距。",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

//
// BACKGROUND
//

const bg_color_property_info: LVGLPropertyInfo = {
    name: "bg_color",
    displayName: "背景颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_COLOR,
        description: "设置对象的背景颜色。",
        defaultValue: "0xffffff",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
export const bg_opa_property_info: LVGLPropertyInfo = {
    name: "bg_opa",
    displayName: "背景透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_OPA,
        description:
            "设置背景的透明度。0、LV_OPA_0 或 LV_OPA_TRANSP 表示完全透明；255、LV_OPA_100 或 LV_OPA_COVER 表示完全不透明；其他值（如 LV_OPA_10、LV_OPA_20 等）表示半透明效果。",
        defaultValue: "LV_OPA_TRANSP",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_grad_color_property_info: LVGLPropertyInfo = {
    name: "bg_grad_color",
    displayName: "渐变颜色(起始)",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_GRAD_COLOR,
        description:
            "设置背景的渐变颜色。仅在渐变方向（grad_dir）不为 LV_GRAD_DIR_NONE 时生效。",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_grad_dir_property_info = makeEnumPropertyInfo(
    "bg_grad_dir",
    "渐变方向",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_GRAD_DIR,
        description:
            "设置背景渐变的延伸方向。可选值：LV_GRAD_DIR_NONE（无方向）/HOR（水平）/VER（垂直）。",
        defaultValue: "LV_GRAD_DIR_NONE",
        inherited: false,
        layout: false,
        extDraw: false
    },
    [
        "NONE", // No gradient (the `grad_color` property is ignored)
        "VER", // Vertical (top to bottom) gradient
        "HOR" // Horizontal (left to right) gradient
    ],
    "LV_GRAD_DIR_"
);
const bg_main_stop_property_info: LVGLPropertyInfo = {
    name: "bg_main_stop",
    displayName: "渐变主色终点",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_MAIN_STOP,
        description:
            "设置背景主色在渐变中的结束位置。0 表示顶部/左侧，255 表示底部/右侧，128 对应中心区域，以此类推。",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_grad_stop_property_info: LVGLPropertyInfo = {
    name: "bg_grad_stop",
    displayName: "渐变颜色(结束)",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_GRAD_STOP,
        description:
            "设置渐变颜色的结束位置。0 表示顶部/左侧，255 表示底部/右侧，128 对应中心区域，以此类推。",
        defaultValue: "255",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_main_opa_property_info: LVGLPropertyInfo = {
    name: "bg_main_opa",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_MAIN_OPA,
        description: "",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_grad_opa_property_info: LVGLPropertyInfo = {
    name: "bg_grad_opa",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_GRAD_OPA,
        description: "",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_grad_property_info: LVGLPropertyInfo = {
    name: "bg_grad",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_GRAD,
        description:
            "Set the gradient definition. The pointed instance must exist while the object is alive. NULL to disable. It wraps BG_GRAD_COLOR, BG_GRAD_DIR, BG_MAIN_STOP and BG_GRAD_STOP into one descriptor and allows creating gradients with more colors too.",
        defaultValue: "NULL",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_dither_mode_property_info = makeEnumPropertyInfo(
    "bg_dither_mode",
    "Dither mode",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_DITHER_MODE,
        description:
            "Set the dithering mode of the gradient of the background. The possible values are LV_DITHER_NONE/ORDERED/ERR_DIFF.",
        defaultValue: "LV_DITHER_NONE",
        inherited: false,
        layout: false,
        extDraw: false
    },
    [
        "NONE", // No dithering, colors are just quantized to the output resolution
        "ORDERED", // Ordered dithering. Faster to compute and use less memory but lower quality
        "ERR_DIFF" // Error diffusion mode. Slower to compute and use more memory but give highest dither quality
    ],
    "LV_DITHER_"
);
const bg_img_src_property_info: LVGLPropertyInfo = {
    name: "bg_img_src",
    displayName: "图像来源",
    type: PropertyType.ObjectReference,
    referencedObjectCollectionPath: "bitmaps",
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_IMG_SRC,
        description:
            "Set a background image. Can be a pointer to lv_img_dsc_t, a path to a file or an LV_SYMBOL_...",
        defaultValue: "NULL",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const bg_img_opa_property_info: LVGLPropertyInfo = {
    name: "bg_img_opa",
    displayName: "图像透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_IMG_OPA,
        description:
            "Set the opacity of the background image. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_img_recolor_property_info: LVGLPropertyInfo = {
    name: "bg_img_recolor",
    displayName: "图像着色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_IMG_RECOLOR,
        description: "Set a color to mix to the background image.",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_img_recolor_opa_property_info: LVGLPropertyInfo = {
    name: "bg_img_recolor_opa",
    displayName: "图像着色透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_IMG_RECOLOR_OPA,
        description:
            "Set the intensity of background image recoloring. Value 0, LV_OPA_0 or LV_OPA_TRANSP means no mixing, 255, LV_OPA_100 or LV_OPA_COVER means full recoloring, other values or LV_OPA_10, LV_OPA_20, etc are interpreted proportionally.",
        defaultValue: "LV_OPA_TRANSP",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const bg_img_tiled_property_info: LVGLPropertyInfo = {
    name: "bg_img_tiled",
    displayName: "图像平铺",
    type: PropertyType.Boolean,
    checkboxStyleSwitch: true,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BG_IMG_TILED,
        description:
            "If enabled the background image will be tiled. The possible values are true or false.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

//
// BORDER
//

const border_color_property_info: LVGLPropertyInfo = {
    name: "border_color",
    displayName: "颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BORDER_COLOR,
        description: "Set the color of the border",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const border_opa_property_info: LVGLPropertyInfo = {
    name: "border_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BORDER_OPA,
        description:
            "Set the opacity of the border. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
export const border_width_property_info: LVGLPropertyInfo = {
    name: "border_width",
    displayName: "宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BORDER_WIDTH,
        description:
            "Set hte width of the border. Only pixel values can be used.",
        defaultValue: "0",
        inherited: false,
        layout: true,
        extDraw: false
    }
};

const BorderSide = observer(
    class BorderSide extends React.Component<PropertyProps> {
        changeValue(newValue: any) {
            this.props.updateObject({
                [this.props.propertyInfo.name]: newValue
            });
        }

        render() {
            const { objects, propertyInfo, readOnly } = this.props;

            let enumItems: EnumItem[];

            if (propertyInfo.enumItems) {
                enumItems = getEnumItems(this.props.objects, propertyInfo);
            } else {
                enumItems = [];
            }

            const options = enumItems.map(enumItem => ({
                value: enumItem.id.toString(),
                label: (enumItem.label || enumItem.id).toString()
            }));

            let propertyValue = (objects[0] as any)[propertyInfo.name];
            for (let i = 1; i < objects.length; i++) {
                if ((objects[i] as any)[propertyInfo.name] != propertyValue) {
                    propertyValue = undefined;
                }
            }

            let selectedValues: any;
            let isMulti = false;

            if (propertyValue != undefined) {
                if (propertyValue == "NONE") {
                    selectedValues = [options[0]];
                } else if (propertyValue == "FULL") {
                    selectedValues = [options[5]];
                } else if (propertyValue == "INTERNAL") {
                    selectedValues = [options[6]];
                } else {
                    selectedValues = [];

                    propertyValue
                        .toString()
                        .split("|")
                        .forEach((part: string) => {
                            if (part == "BOTTOM") {
                                selectedValues.push(options[1]);
                            } else if (part == "TOP") {
                                selectedValues.push(options[2]);
                            } else if (part == "LEFT") {
                                selectedValues.push(options[3]);
                            } else if (part == "RIGHT") {
                                selectedValues.push(options[4]);
                            }
                        });

                    isMulti = true;
                }
            } else {
                selectedValues = [];
            }

            settingsController.isDarkTheme;

            return (
                <Select
                    options={options}
                    isMulti={isMulti}
                    onChange={selectedValues => {
                        if (!Array.isArray(selectedValues)) {
                            selectedValues = [selectedValues];
                        }

                        let propertyValue = "";

                        if (selectedValues.length == 0) {
                            propertyValue = "NONE";
                        } else if (
                            selectedValues[selectedValues.length - 1].value ==
                            "NONE"
                        ) {
                            propertyValue = "NONE";
                        } else if (
                            selectedValues[selectedValues.length - 1].value ==
                            "FULL"
                        ) {
                            propertyValue = "FULL";
                        } else if (
                            selectedValues[selectedValues.length - 1].value ==
                            "INTERNAL"
                        ) {
                            propertyValue = "INTERNAL";
                        } else {
                            for (let i = 0; i < selectedValues.length; i++) {
                                if (
                                    selectedValues[i].value == "BOTTOM" ||
                                    selectedValues[i].value == "TOP" ||
                                    selectedValues[i].value == "LEFT" ||
                                    selectedValues[i].value == "RIGHT"
                                ) {
                                    propertyValue =
                                        (propertyValue
                                            ? propertyValue + "|"
                                            : "") + selectedValues[i].value;
                                }
                            }
                        }

                        if (!propertyValue) {
                            propertyValue = "NONE";
                        }

                        this.changeValue(propertyValue);
                    }}
                    isDisabled={readOnly}
                    isClearable={false}
                    value={selectedValues}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    theme={theme => {
                        return {
                            ...theme,
                            colors: {
                                ...theme.colors,

                                danger: "#DE350B",
                                dangerLight: "#FFBDAD",

                                ...(settingsController.isDarkTheme
                                    ? {
                                          neutral0: "hsl(0, 0%, 10%)",
                                          neutral5: "hsl(0, 0%, 20%)",
                                          neutral10: "hsl(0, 0%, 30%)",
                                          neutral20: "hsl(0, 0%, 40%)",
                                          neutral30: "hsl(0, 0%, 50%)",
                                          neutral40: "hsl(0, 0%, 60%)",
                                          neutral50: "hsl(0, 0%, 70%)",
                                          neutral60: "hsl(0, 0%, 80%)",
                                          neutral70: "hsl(0, 0%, 90%)",
                                          neutral80: "hsl(0, 0%, 95%)",
                                          neutral90: "hsl(0, 0%, 100%)"
                                      }
                                    : {
                                          neutral0: "hsl(0, 0%, 100%)",
                                          neutral5: "hsl(0, 0%, 95%)",
                                          neutral10: "hsl(0, 0%, 90%)",
                                          neutral20: "hsl(0, 0%, 80%)",
                                          neutral30: "hsl(0, 0%, 70%)",
                                          neutral40: "hsl(0, 0%, 60%)",
                                          neutral50: "hsl(0, 0%, 50%)",
                                          neutral60: "hsl(0, 0%, 40%)",
                                          neutral70: "hsl(0, 0%, 30%)",
                                          neutral80: "hsl(0, 0%, 20%)",
                                          neutral90: "hsl(0, 0%, 10%)"
                                      }),

                                primary: "#2684FF",
                                primary25: "#DEEBFF",
                                primary50: "#B2D4FF",
                                primary75: "#4C9AFF"
                            }
                        };
                    }}
                    styles={{
                        option: (baseStyles, state) => ({
                            ...baseStyles,
                            ...(settingsController.isDarkTheme &&
                            state.isFocused
                                ? { color: "#333" }
                                : {})
                        })
                    }}
                />
            );
        }
    }
);

const border_side_property_info = makeEnumPropertyInfo(
    "border_side",
    "边框位置",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BORDER_SIDE,
        description:
            "Set only which side(s) the border should be drawn. The possible values are LV_BORDER_SIDE_NONE/TOP/BOTTOM/LEFT/RIGHT/INTERNAL. OR-ed values can be used as well, e.g. LV_BORDER_SIDE_TOP | LV_BORDER_SIDE_LEFT.",
        defaultValue: "LV_BORDER_SIDE_NONE",
        inherited: false,
        layout: false,
        extDraw: false,

        valueRead: (value: number) => {
            if (value == 0x00) {
                return "NONE";
            }

            if (value == 0x0f) {
                return "FULL";
            }

            if (value == 0x10) {
                return "INTERNAL";
            }

            let propertyValue = "";

            if (value & 0x01) {
                propertyValue =
                    (propertyValue ? propertyValue + "|" : "") + "BOTTOM";
            }

            if (value & 0x02) {
                propertyValue =
                    (propertyValue ? propertyValue + "|" : "") + "TOP";
            }

            if (value & 0x04) {
                propertyValue =
                    (propertyValue ? propertyValue + "|" : "") + "LEFT";
            }

            if (value & 0x08) {
                propertyValue =
                    (propertyValue ? propertyValue + "|" : "") + "RIGHT";
            }

            return propertyValue;
        },
        valueToNum: (value: string) => {
            if (value == "NONE") {
                return 0;
            }

            if (value == "FULL") {
                return 0x0f;
            }

            if (value == "INTERNAL") {
                return 0x10;
            }

            let num = 0;

            if (value.indexOf("BOTTOM") != -1) {
                num |= 0x01;
            }

            if (value.indexOf("TOP") != -1) {
                num |= 0x02;
            }

            if (value.indexOf("LEFT") != -1) {
                num |= 0x04;
            }

            if (value.indexOf("RIGHT") != -1) {
                num |= 0x08;
            }

            return num;
        },
        valueBuild: (value: string) => {
            if (value == "NONE") {
                return "LV_BORDER_SIDE_NONE";
            }

            if (value == "FULL") {
                return "LV_BORDER_SIDE_FULL";
            }

            if (value == "INTERNAL") {
                return "LV_BORDER_SIDE_INTERNAL";
            }

            let build = "";

            if (value.indexOf("BOTTOM") != -1) {
                build = (build ? build + "|" : "") + "LV_BORDER_SIDE_BOTTOM";
            }

            if (value.indexOf("TOP") != -1) {
                build = (build ? build + "|" : "") + "LV_BORDER_SIDE_TOP";
            }

            if (value.indexOf("LEFT") != -1) {
                build = (build ? build + "|" : "") + "LV_BORDER_SIDE_LEFT";
            }

            if (value.indexOf("RIGHT") != -1) {
                build = (build ? build + "|" : "") + "LV_BORDER_SIDE_RIGHT";
            }

            return build;
        }
    },
    {
        NONE: 0x00,
        BOTTOM: 0x01,
        TOP: 0x02,
        LEFT: 0x04,
        RIGHT: 0x08,
        FULL: 0x0f,
        INTERNAL: 0x10 // FOR matrix-like objects (e.g. Button matrix)
    },
    "LV_BORDER_SIDE_",
    BorderSide
);

const border_post_property_info: LVGLPropertyInfo = {
    name: "border_post",
    displayName: "Post",
    type: PropertyType.Boolean,
    checkboxStyleSwitch: true,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BORDER_POST,
        description:
            "Sets whether the border should be drawn before or after the children are drawn. true: after children, false: before children",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

//
// OUTLINE
//

const outline_width_property_info: LVGLPropertyInfo = {
    name: "outline_width",
    displayName: "宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_OUTLINE_WIDTH,
        description: "Set the width of the outline in pixels.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const outline_color_property_info: LVGLPropertyInfo = {
    name: "outline_color",
    displayName: "颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_OUTLINE_COLOR,
        description: "Set the color of the outline.",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const outline_opa_property_info: LVGLPropertyInfo = {
    name: "outline_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_OUTLINE_OPA,
        description:
            "Set the opacity of the outline. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const outline_pad_property_info: LVGLPropertyInfo = {
    name: "outline_pad",
    displayName: "间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_OUTLINE_PAD,
        description:
            "Set the padding of the outline, i.e. the gap between object and the outline.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};

//
// SHADOW
//

const shadow_width_property_info: LVGLPropertyInfo = {
    name: "shadow_width",
    displayName: "宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_SHADOW_WIDTH,
        description:
            "Set the width of the shadow in pixels. The value should be >= 0.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const shadow_ofs_x_property_info: LVGLPropertyInfo = {
    name: "shadow_ofs_x",
    displayName: "X 偏移",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_SHADOW_OFS_X,
        description: "Set an offset on the shadow in pixels in X direction.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const shadow_ofs_y_property_info: LVGLPropertyInfo = {
    name: "shadow_ofs_y",
    displayName: "Y 偏移",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_SHADOW_OFS_Y,
        description: "Set an offset on the shadow in pixels in Y direction.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const shadow_spread_property_info: LVGLPropertyInfo = {
    name: "shadow_spread",
    displayName: "Spread",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_SHADOW_SPREAD,
        description:
            "Make the shadow calculation to use a larger or smaller rectangle as base. The value can be in pixel to make the area larger/smaller",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const shadow_color_property_info: LVGLPropertyInfo = {
    name: "shadow_color",
    displayName: "颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_SHADOW_COLOR,
        description: "Set the color of the shadow",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const shadow_opa_property_info: LVGLPropertyInfo = {
    name: "shadow_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_SHADOW_OPA,
        description:
            "Set the opacity of the shadow. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: true
    }
};

//
// IMAGE
//

const img_opa_property_info: LVGLPropertyInfo = {
    name: "img_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_IMG_OPA,
        description:
            "Set the opacity of an image. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const img_recolor_property_info: LVGLPropertyInfo = {
    name: "img_recolor",
    displayName: "重新着色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_IMG_RECOLOR,
        description: "Set color to mix to the image.",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const img_recolor_opa_property_info: LVGLPropertyInfo = {
    name: "img_recolor_opa",
    displayName: "着色透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_IMG_RECOLOR_OPA,
        description:
            "Set the intensity of the color mixing. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

//
// LINE
//

const line_width_property_info: LVGLPropertyInfo = {
    name: "line_width",
    displayName: "宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LINE_WIDTH,
        description: "Set the width of the lines in pixel.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const line_dash_width_property_info: LVGLPropertyInfo = {
    name: "line_dash_width",
    displayName: "虚线宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LINE_DASH_WIDTH,
        description:
            "Set the width of dashes in pixel. Note that dash works only on horizontal and vertical lines",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const line_dash_gap_property_info: LVGLPropertyInfo = {
    name: "line_dash_gap",
    displayName: "虚线间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LINE_DASH_GAP,
        description:
            "Set the gap between dashes in pixel. Note that dash works only on horizontal and vertical lines",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const line_rounded_property_info: LVGLPropertyInfo = {
    name: "line_rounded",
    displayName: "圆角",
    type: PropertyType.Boolean,
    checkboxStyleSwitch: true,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LINE_ROUNDED,
        description:
            "Make the end points of the lines rounded. true: rounded, false: perpendicular line ending",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const line_color_property_info: LVGLPropertyInfo = {
    name: "line_color",
    displayName: "颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LINE_COLOR,
        description: "Set the color fo the lines.",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const line_opa_property_info: LVGLPropertyInfo = {
    name: "line_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_LINE_OPA,
        description: "Set the opacity of the lines.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

//
// ARC
//

const arc_width_property_info: LVGLPropertyInfo = {
    name: "arc_width",
    displayName: "宽度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ARC_WIDTH,
        description: "Set the width (thickness) of the arcs in pixel.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: true
    }
};
const arc_rounded_property_info: LVGLPropertyInfo = {
    name: "arc_rounded",
    displayName: "圆角",
    type: PropertyType.Boolean,
    checkboxStyleSwitch: true,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ARC_ROUNDED,
        description:
            "Make the end points of the arcs rounded. true: rounded, false: perpendicular line ending",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const arc_color_property_info: LVGLPropertyInfo = {
    name: "arc_color",
    displayName: "颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ARC_COLOR,
        description: "Set the color of the arc.",
        defaultValue: "0x000000",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const arc_opa_property_info: LVGLPropertyInfo = {
    name: "arc_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ARC_OPA,
        description: "Set the opacity of the arcs.",
        defaultValue: "LV_OPA_COVER",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const arc_img_src_property_info: LVGLPropertyInfo = {
    name: "arc_img_src",
    displayName: "图像来源",
    type: PropertyType.ObjectReference,
    referencedObjectCollectionPath: "bitmaps",
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ARC_IMG_SRC,
        description:
            "Set an image from which the arc will be masked out. It's useful to display complex effects on the arcs. Can be a pointer to lv_img_dsc_t or a path to a file",
        defaultValue: "NULL",
        inherited: false,
        layout: false,
        extDraw: false
    }
};

//
// TEXT
//

const text_color_property_info: LVGLPropertyInfo = {
    name: "text_color",
    displayName: "颜色",
    type: PropertyType.ThemedColor,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_COLOR,
        description: "Sets the color of the text.",
        defaultValue: "0x000000",
        inherited: true,
        layout: false,
        extDraw: false
    }
};
const text_opa_property_info: LVGLPropertyInfo = {
    name: "text_opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_OPA,
        description:
            "Set the opacity of the text. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: true,
        layout: false,
        extDraw: false
    }
};
export const text_font_property_info: LVGLPropertyInfo = {
    name: "text_font",
    displayName: "字体",
    type: PropertyType.Enum,
    referencedObjectCollectionPath: "fonts",
    enumItems: (propertyValueHolder: PropertyValueHolder) => {
        return [
            ...propertyValueHolder.projectStore.project.fonts.map(font => ({
                id: font.name,
                label: font.name
            })),
            ...BUILT_IN_FONTS.map(id => ({ id, label: id }))
        ];
    },
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_FONT,
        description: "Set the font of the text (a pointer lv_font_t *).",
        defaultValue: "LV_FONT_DEFAULT",
        inherited: true,
        layout: true,
        extDraw: false
    }
};
const text_letter_space_property_info: LVGLPropertyInfo = {
    name: "text_letter_space",
    displayName: "字母间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_LETTER_SPACE,
        description: "Set the letter space in pixels",
        defaultValue: "0",
        inherited: true,
        layout: true,
        extDraw: false
    }
};
const text_line_space_property_info: LVGLPropertyInfo = {
    name: "text_line_space",
    displayName: "行间距",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_LINE_SPACE,
        description: "Set the line space in pixels.",
        defaultValue: "0",
        inherited: true,
        layout: true,
        extDraw: false
    }
};

const TextDecorationSide = observer(
    class TextDecorationSide extends React.Component<PropertyProps> {
        changeValue(newValue: any) {
            this.props.updateObject({
                [this.props.propertyInfo.name]: newValue
            });
        }

        render() {
            const { objects, propertyInfo, readOnly } = this.props;

            let enumItems: EnumItem[];

            if (propertyInfo.enumItems) {
                enumItems = getEnumItems(this.props.objects, propertyInfo);
            } else {
                enumItems = [];
            }

            const options = enumItems.map(enumItem => ({
                value: enumItem.id.toString(),
                label: (enumItem.label || enumItem.id).toString()
            }));

            let propertyValue = (objects[0] as any)[propertyInfo.name];
            for (let i = 1; i < objects.length; i++) {
                if ((objects[i] as any)[propertyInfo.name] != propertyValue) {
                    propertyValue = undefined;
                }
            }

            let selectedValues: any;
            let isMulti = false;

            if (propertyValue != undefined) {
                if (propertyValue == "NONE") {
                    selectedValues = [options[0]];
                } else {
                    selectedValues = [];

                    propertyValue
                        .toString()
                        .split("|")
                        .forEach((part: string) => {
                            if (part == "UNDERLINE") {
                                selectedValues.push(options[1]);
                            } else if (part == "STRIKETHROUGH") {
                                selectedValues.push(options[2]);
                            }
                        });

                    isMulti = true;
                }
            } else {
                selectedValues = [];
            }

            settingsController.isDarkTheme;

            return (
                <Select
                    options={options}
                    isMulti={isMulti}
                    onChange={selectedValues => {
                        if (!Array.isArray(selectedValues)) {
                            selectedValues = [selectedValues];
                        }

                        let propertyValue = "";

                        if (selectedValues.length == 0) {
                            propertyValue = "NONE";
                        } else if (
                            selectedValues[selectedValues.length - 1].value ==
                            "NONE"
                        ) {
                            propertyValue = "NONE";
                        } else {
                            for (let i = 0; i < selectedValues.length; i++) {
                                if (
                                    selectedValues[i].value == "UNDERLINE" ||
                                    selectedValues[i].value == "STRIKETHROUGH"
                                ) {
                                    propertyValue =
                                        (propertyValue
                                            ? propertyValue + "|"
                                            : "") + selectedValues[i].value;
                                }
                            }
                        }

                        if (!propertyValue) {
                            propertyValue = "NONE";
                        }

                        this.changeValue(propertyValue);
                    }}
                    isDisabled={readOnly}
                    isClearable={false}
                    value={selectedValues}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    theme={theme => {
                        return {
                            ...theme,
                            colors: {
                                ...theme.colors,

                                danger: "#DE350B",
                                dangerLight: "#FFBDAD",

                                ...(settingsController.isDarkTheme
                                    ? {
                                          neutral0: "hsl(0, 0%, 10%)",
                                          neutral5: "hsl(0, 0%, 20%)",
                                          neutral10: "hsl(0, 0%, 30%)",
                                          neutral20: "hsl(0, 0%, 40%)",
                                          neutral30: "hsl(0, 0%, 50%)",
                                          neutral40: "hsl(0, 0%, 60%)",
                                          neutral50: "hsl(0, 0%, 70%)",
                                          neutral60: "hsl(0, 0%, 80%)",
                                          neutral70: "hsl(0, 0%, 90%)",
                                          neutral80: "hsl(0, 0%, 95%)",
                                          neutral90: "hsl(0, 0%, 100%)"
                                      }
                                    : {
                                          neutral0: "hsl(0, 0%, 100%)",
                                          neutral5: "hsl(0, 0%, 95%)",
                                          neutral10: "hsl(0, 0%, 90%)",
                                          neutral20: "hsl(0, 0%, 80%)",
                                          neutral30: "hsl(0, 0%, 70%)",
                                          neutral40: "hsl(0, 0%, 60%)",
                                          neutral50: "hsl(0, 0%, 50%)",
                                          neutral60: "hsl(0, 0%, 40%)",
                                          neutral70: "hsl(0, 0%, 30%)",
                                          neutral80: "hsl(0, 0%, 20%)",
                                          neutral90: "hsl(0, 0%, 10%)"
                                      }),

                                primary: "#2684FF",
                                primary25: "#DEEBFF",
                                primary50: "#B2D4FF",
                                primary75: "#4C9AFF"
                            }
                        };
                    }}
                    styles={{
                        option: (baseStyles, state) => ({
                            ...baseStyles,
                            ...(settingsController.isDarkTheme &&
                            state.isFocused
                                ? { color: "#333" }
                                : {})
                        })
                    }}
                />
            );
        }
    }
);

const text_decor_property_info = makeEnumPropertyInfo(
    "text_decor",
    "样式",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_DECOR,
        description:
            "Set decoration for the text. The possible values are LV_TEXT_DECOR_NONE/UNDERLINE/STRIKETHROUGH. OR-ed values can be used as well.",
        defaultValue: "LV_TEXT_DECOR_NONE",
        inherited: true,
        layout: false,
        extDraw: false,

        valueRead: (value: number) => {
            if (value == 0x00) {
                return "NONE";
            }

            let propertyValue = "";

            if (value & 0x01) {
                propertyValue =
                    (propertyValue ? propertyValue + "|" : "") + "UNDERLINE";
            }

            if (value & 0x02) {
                propertyValue =
                    (propertyValue ? propertyValue + "|" : "") +
                    "STRIKETHROUGH";
            }

            return propertyValue;
        },
        valueToNum: (value: string) => {
            if (value == "NONE") {
                return 0;
            }

            let num = 0;

            if (value.indexOf("UNDERLINE") != -1) {
                num |= 0x01;
            }

            if (value.indexOf("STRIKETHROUGH") != -1) {
                num |= 0x02;
            }

            return num;
        },
        valueBuild: (value: string) => {
            if (value == "NONE") {
                return "LV_TEXT_DECOR_NONE";
            }

            let build = "";

            if (value.indexOf("UNDERLINE") != -1) {
                build = (build ? build + "|" : "") + "LV_TEXT_DECOR_UNDERLINE";
            }

            if (value.indexOf("STRIKETHROUGH") != -1) {
                build =
                    (build ? build + "|" : "") + "LV_TEXT_DECOR_STRIKETHROUGH";
            }

            return build;
        }
    },
    ["NONE", "UNDERLINE", "STRIKETHROUGH"],
    "LV_TEXT_DECOR_",
    TextDecorationSide
);

const text_align_property_info = makeEnumPropertyInfo(
    "text_align",
    "对齐",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TEXT_ALIGN,
        description:
            "Set how to align the lines of the text. Note that it doesn't align the object itself, only the lines inside the object. The possible values are LV_TEXT_ALIGN_LEFT/CENTER/RIGHT/AUTO. LV_TEXT_ALIGN_AUTO detect the text base direction and uses left or right alignment accordingly",
        defaultValue: "LV_TEXT_ALIGN_AUTO",
        inherited: true,
        layout: true,
        extDraw: false
    },
    ["AUTO", "LEFT", "CENTER", "RIGHT"],
    "LV_TEXT_ALIGN_"
);

//
// MISCELLANEOUS
//

export const radius_property_info: LVGLPropertyInfo = {
    name: "radius",
    displayName: "圆角",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_RADIUS,
        description:
            "Set the radius on every corner. The value is interpreted in pixel (>= 0) or LV_RADIUS_CIRCLE for max. radius",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const clip_corner_property_info: LVGLPropertyInfo = {
    name: "clip_corner",
    displayName: "圆角裁切",
    type: PropertyType.Boolean,
    checkboxStyleSwitch: true,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_CLIP_CORNER,
        description:
            "Enable to clip the overflowed content on the rounded corner. Can be true or false.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
export const opa_property_info: LVGLPropertyInfo = {
    name: "opa",
    displayName: "透明度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_OPA,
        description:
            "Scale down all opacity values of the object by this factor. Value 0, LV_OPA_0 or LV_OPA_TRANSP means fully transparent, 255, LV_OPA_100 or LV_OPA_COVER means fully covering, other values or LV_OPA_10, LV_OPA_20, etc means semi transparency.",
        defaultValue: "LV_OPA_COVER",
        inherited: true,
        layout: false,
        extDraw: false
    }
};
const color_filter_dsc_property_info: LVGLPropertyInfo = {
    name: "color_filter_dsc",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_COLOR_FILTER_DSC,
        description: "Mix a color to all colors of the object.",
        defaultValue: "NULL",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const color_filter_opa_property_info: LVGLPropertyInfo = {
    name: "color_filter_opa",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_COLOR_FILTER_OPA,
        description: "The intensity of mixing of color filter.",
        defaultValue: "LV_OPA_TRANSP",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const anim_property_info: LVGLPropertyInfo = {
    name: "anim",
    type: PropertyType.Any,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ANIM,
        description:
            "The animation template for the object's animation. Should be a pointer to lv_anim_t. The animation parameters are widget specific, e.g. animation time could be the E.g. blink time of the cursor on the text area or scroll time of a roller. See the widgets' documentation to learn more.",
        defaultValue: "NULL",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const anim_time_property_info: LVGLPropertyInfo = {
    name: "anim_time",
    displayName: "动画时间",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ANIM_TIME,
        description:
            "以毫秒为单位, 它的含义是特定于 Widgets 的。请参阅文档以了解更多信息。",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const anim_duration_property_info: LVGLPropertyInfo = {
    name: "anim_duration",
    displayName: "动画持续时长",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ANIM_DURATION,
        description: "",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const anim_speed_property_info: LVGLPropertyInfo = {
    name: "anim_speed",
    displayName: "动画速度",
    type: PropertyType.Number,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_ANIM_SPEED,
        description:
            "The animation speed in pixel/sec. Its meaning is widget specific. E.g. scroll speed of label. See the widgets' documentation to learn more.",
        defaultValue: "0",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const transition_property_info: LVGLPropertyInfo = {
    name: "transition",
    type: PropertyType.Any,
    lvglStyleProp: {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_TRANSITION,
        description:
            "An initialized lv_style_transition_dsc_t to describe a transition.",
        defaultValue: "NULL",
        inherited: false,
        layout: false,
        extDraw: false
    }
};
const blend_mode_property_info = makeEnumPropertyInfo(
    "blend_mode",
    "混合模式",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BLEND_MODE,
        description:
            "Describes how to blend the colors to the background. The possible values are LV_BLEND_MODE_NORMAL/ADDITIVE/SUBTRACTIVE/MULTIPLY",
        defaultValue: "LV_BLEND_MODE_NORMAL",
        inherited: false,
        layout: false,
        extDraw: false
    },
    [
        "NORMAL", // Simply mix according to the opacity value
        "ADDITIVE", // Add the respective color channels
        "SUBTRACTIVE", // Subtract the foreground from the background
        "MULTIPLY", // Multiply the foreground and background
        "REPLACE" // Replace background with foreground in the area
    ],
    "LV_BLEND_MODE_"
);
const base_dir_property_info = makeEnumPropertyInfo(
    "base_dir",
    "基准方向",
    {
        code: LVGL_STYLE_PROP_CODES.LV_STYLE_BASE_DIR,
        description:
            "Set the base direction of the object. The possible values are LV_BIDI_DIR_LTR/RTL/AUTO.",
        defaultValue: "LV_BASE_DIR_AUTO",
        inherited: true,
        layout: true,
        extDraw: false
    },
    ["LTR", "RTL", "AUTO"],
    "LV_BASE_DIR_"
);

////////////////////////////////////////////////////////////////////////////////

export interface LVGLPropertiesGroup {
    groupName: string;
    groupDescription: string;
    properties: LVGLPropertyInfo[];
}

export const lvglProperties: LVGLPropertiesGroup[] = [
    {
        groupName: "大小与位置",
        groupDescription:
            "Properties related to size, position, alignment and layout of the objects.",
        properties: [
            align_property_info,
            //width_property_info,
            //height_property_info,

            length_property_info,

            min_width_property_info,
            max_width_property_info,
            min_height_property_info,
            max_height_property_info,

            //x_property_info,
            //y_property_info,

            transform_width_property_info,
            transform_height_property_info,
            translate_x_property_info,
            translate_y_property_info,

            transform_zoom_property_info,
            transform_scale_x_property_info,
            transform_scale_y_property_info,

            transform_angle_property_info,
            transform_rotation_property_info,

            transform_pivot_x_property_info,
            transform_pivot_y_property_info,

            transform_skew_x_property_info,
            transform_skew_y_property_info
        ]
    },

    {
        groupName: "布局",
        groupDescription: "Properties to describe layout.",
        properties: [
            layout_property_info,

            flex_flow_property_info,
            flex_main_place_property_info,
            flex_cross_place_property_info,
            flex_track_place_property_info,
            flex_grow_property_info,

            grid_column_align_property_info,
            grid_column_dsc_array_property_info,

            grid_row_align_property_info,
            grid_row_dsc_array_property_info,

            grid_cell_x_align_property_info,
            grid_cell_column_pos_property_info,
            grid_cell_column_span_property_info,

            grid_cell_y_align_property_info,
            grid_cell_row_pos_property_info,
            grid_cell_row_span_property_info
        ]
    },

    {
        groupName: "间距",
        groupDescription:
            "Properties to describe spacing between the parent's sides and the children and among the children. Very similar to the padding properties in HTML.",
        properties: [
            pad_top_property_info,
            pad_bottom_property_info,
            pad_left_property_info,
            pad_right_property_info,
            pad_row_property_info,
            pad_column_property_info
        ]
    },

    {
        groupName: "边距",
        groupDescription:
            "Properties to describe spacing around an object. Very similar to the margin properties in HTML.",
        properties: [
            margin_top_property_info,
            margin_bottom_property_info,
            margin_left_property_info,
            margin_right_property_info
        ]
    },

    {
        groupName: "背景",
        groupDescription:
            "Properties to describe the background color and image of the objects.",
        properties: [
            bg_color_property_info,
            bg_opa_property_info,

            bg_grad_dir_property_info,
            bg_grad_color_property_info,
            bg_grad_stop_property_info,
            bg_main_stop_property_info,

            bg_main_opa_property_info,
            bg_grad_opa_property_info,
            //bg_grad_property_info,
            bg_dither_mode_property_info,

            bg_img_src_property_info,
            bg_img_opa_property_info,
            bg_img_recolor_property_info,
            bg_img_recolor_opa_property_info,

            bg_img_tiled_property_info
        ]
    },

    {
        groupName: "边框",
        groupDescription: "Properties to describe the borders",
        properties: [
            border_color_property_info,
            border_opa_property_info,
            border_width_property_info,
            border_side_property_info,
            border_post_property_info
        ]
    },

    {
        groupName: "轮廓",
        groupDescription:
            "Properties to describe the outline. It's like a border but drawn outside of the rectangles.",
        properties: [
            outline_width_property_info,
            outline_color_property_info,
            outline_opa_property_info,
            outline_pad_property_info
        ]
    },

    {
        groupName: "阴影",
        groupDescription:
            "Properties to describe the shadow drawn under the rectangles.",
        properties: [
            shadow_width_property_info,
            shadow_ofs_x_property_info,
            shadow_ofs_y_property_info,
            shadow_spread_property_info,
            shadow_color_property_info,
            shadow_opa_property_info
        ]
    },

    {
        groupName: "图像",
        groupDescription: "Properties to describe the images",
        properties: [
            img_opa_property_info,
            img_recolor_property_info,
            img_recolor_opa_property_info
        ]
    },

    {
        groupName: "线条",
        groupDescription: "Properties to describe line-like objects",
        properties: [
            line_width_property_info,
            line_dash_width_property_info,
            line_dash_gap_property_info,
            line_rounded_property_info,
            line_color_property_info,
            line_opa_property_info
        ]
    },

    {
        groupName: "圆弧",
        groupDescription: "TODO",
        properties: [
            arc_width_property_info,
            arc_rounded_property_info,
            arc_color_property_info,
            arc_opa_property_info,
            arc_img_src_property_info
        ]
    },

    {
        groupName: "文本",
        groupDescription:
            "Properties to describe the properties of text. All these properties are inherited.",
        properties: [
            text_color_property_info,
            text_opa_property_info,
            text_font_property_info,
            text_letter_space_property_info,
            text_line_space_property_info,
            text_decor_property_info,
            text_align_property_info
        ]
    },

    {
        groupName: "杂项",
        groupDescription: "Mixed properties for various purposes.",
        properties: [
            radius_property_info,
            clip_corner_property_info,
            opa_property_info,
            //color_filter_dsc_property_info,
            //color_filter_opa_property_info,
            //anim_property_info,
            //anim_time_property_info,
            //anim_speed_property_info,
            //transition_property_info,
            blend_mode_property_info,
            base_dir_property_info,

            anim_time_property_info,
            anim_duration_property_info,
            anim_speed_property_info
        ]
    }
];

export const unusedProperties = [
    width_property_info,
    height_property_info,
    x_property_info,
    y_property_info,

    bg_grad_property_info,

    color_filter_dsc_property_info,
    color_filter_opa_property_info,
    anim_property_info,
    transition_property_info
];

export const lvglPropertiesMap = new Map<string, LVGLPropertyInfo>();
lvglProperties.forEach(propertyGroup =>
    propertyGroup.properties.forEach(property => {
        if (lvglPropertiesMap.get(property.name)) {
            console.error("UNEXPECTED!", property.name);
        }
        lvglPropertiesMap.set(property.name, property);
    })
);

export function isLvglStylePropertySupported(
    object: IEezObject,
    propertyInfo: LVGLPropertyInfo
) {
    const lvglVersion =
        ProjectEditor.getProject(object).settings.general.lvglVersion;

    return propertyInfo.lvglStyleProp.code[lvglVersion] != undefined;
}
