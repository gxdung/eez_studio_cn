import type {
    IEezObject,
    IPropertyGridGroupDefinition,
    PropertyInfo
} from "project-editor/core/object";
import { ProjectEditor } from "project-editor/project-editor-interface";

export const indentationGroup: IPropertyGridGroupDefinition = {
    id: "indentation",
    title: "缩进",
    position: 2
};

export const generalGroup: IPropertyGridGroupDefinition = {
    id: "general",
    title: "通用",
    position: (object: IEezObject) =>
        object instanceof ProjectEditor.ActionComponentClass ? 0 : 1
};

export const specificGroup: IPropertyGridGroupDefinition = {
    id: "specific",
    title: "特定",
    position: (object: IEezObject) =>
        object instanceof ProjectEditor.ActionComponentClass ? 1 : 2
};

export const layoutGroup: IPropertyGridGroupDefinition = {
    id: "layout",
    title: "布局",
    position: (object: IEezObject) =>
        object instanceof ProjectEditor.ActionComponentClass
            ? 3
            : object instanceof ProjectEditor.LVGLWidgetClass
            ? 2
            : 0
};

export const flowGroup: IPropertyGridGroupDefinition = {
    id: "flow",
    title: "工作流",
    position: (object: IEezObject) =>
        object instanceof ProjectEditor.ActionComponentClass ? 2 : 5
};

export const geometryGroup: IPropertyGridGroupDefinition = {
    id: "geometry",
    title: "位置和大小",
    position: (object: IEezObject) =>
        object instanceof ProjectEditor.ActionComponentClass
            ? 3
            : object instanceof ProjectEditor.LVGLWidgetClass ||
              object instanceof ProjectEditor.PageClass
            ? 2
            : 0
};

export const styleGroup: IPropertyGridGroupDefinition = {
    id: "style",
    title: "样式",
    position: (object: IEezObject) =>
        object instanceof ProjectEditor.ActionComponentClass ? 4 : 3
};

export const timelineGroup: IPropertyGridGroupDefinition = {
    id: "timeline",
    title: "时间轴关键帧",
    position: (object: IEezObject) => -2
};

export interface IGroupProperties {
    group: IPropertyGridGroupDefinition;
    properties: PropertyInfo[];
}

export function getPropertyGroups(
    object: IEezObject,
    properties: PropertyInfo[]
) {
    const groupPropertiesArray: IGroupProperties[] = [];

    let groupForPropertiesWithoutGroupSpecified: IGroupProperties | undefined;

    for (let propertyInfo of properties) {
        const propertyGroup = propertyInfo.propertyGridGroup;

        let propertiesInGroup: PropertyInfo[];

        if (propertyGroup) {
            let groupProperties = groupPropertiesArray.find(
                groupProperties => groupProperties.group.id === propertyGroup.id
            );

            if (!groupProperties) {
                groupProperties = {
                    group: propertyGroup,
                    properties: []
                };
                groupPropertiesArray.push(groupProperties);
            }

            propertiesInGroup = groupProperties.properties;
        } else {
            if (!groupForPropertiesWithoutGroupSpecified) {
                groupForPropertiesWithoutGroupSpecified = {
                    group: {
                        id: "",
                        title: ""
                    },
                    properties: []
                };

                groupPropertiesArray.push(
                    groupForPropertiesWithoutGroupSpecified
                );
            }
            propertiesInGroup =
                groupForPropertiesWithoutGroupSpecified.properties;
        }

        propertiesInGroup.push(propertyInfo);
    }

    let maxPosition = 0;

    groupPropertiesArray.forEach(groupProperties => {
        if (groupProperties.group.position != undefined) {
            let position;
            if (typeof groupProperties.group.position == "number") {
                position = groupProperties.group.position;
            } else {
                position = groupProperties.group.position(object);
            }
            if (position > maxPosition) {
                maxPosition = position;
            }
        }
    });

    groupPropertiesArray.sort((a: IGroupProperties, b: IGroupProperties) => {
        const aPosition =
            a.group.position !== undefined
                ? typeof a.group.position == "number"
                    ? a.group.position
                    : a.group.position(object)
                : maxPosition + 1;

        const bPosition =
            b.group.position !== undefined
                ? typeof b.group.position == "number"
                    ? b.group.position
                    : b.group.position(object)
                : maxPosition + 1;

        return aPosition - bPosition;
    });

    return groupPropertiesArray;
}
